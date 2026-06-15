import PDFDocument from "pdfkit";

const money = (value = 0) => Number(value || 0).toFixed(2);

const formatDate = (value) => {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
};

const writeKeyValue = (doc, label, value, x, y, width = 180) => {
    doc.fontSize(9).fillColor("#6b7280").text(label, x, y, { width });
    doc.fontSize(10).fillColor("#111827").text(value ?? "-", x, y + 12, { width });
};

const writeInvoiceBody = (doc, { invoice, customer, vehicle, jobCard, serviceRecord, garage }) => {
    doc.info.Title = `Invoice ${invoice.invoiceNumber}`;
    doc.info.Author = garage?.name || "Garage";

    doc.fontSize(20).fillColor("#111827").text(garage?.name || "Garage Invoice", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#6b7280").text(garage?.address || "", { align: "center" });
    doc.fontSize(10).fillColor("#6b7280").text(garage?.phone || "", { align: "center" });
    doc.moveDown(0.8);

    doc.roundedRect(40, 120, 515, 78, 8).strokeColor("#d1d5db").stroke();
    writeKeyValue(doc, "Invoice Number", invoice.invoiceNumber, 55, 135);
    writeKeyValue(doc, "Invoice Date", formatDate(invoice.createdAt), 210, 135);
    writeKeyValue(doc, "Payment Status", invoice.paymentStatus, 365, 135);
    writeKeyValue(doc, "Payment Method", invoice.paymentMethod || "-", 455, 135, 100);

    doc.roundedRect(40, 215, 515, 95, 8).strokeColor("#d1d5db").stroke();
    doc.fontSize(12).fillColor("#111827").text("Customer & Vehicle Details", 55, 227);
    writeKeyValue(doc, "Customer", `${customer.firstName} ${customer.lastName || ""}`.trim(), 55, 245);
    writeKeyValue(doc, "Phone", customer.phone, 210, 245);
    writeKeyValue(doc, "Vehicle", `${vehicle.brand} ${vehicle.model}`.trim(), 365, 245);
    writeKeyValue(doc, "Registration", vehicle.registrationNumber, 55, 270);
    writeKeyValue(doc, "Fuel Type", vehicle.fuelType, 210, 270);
    writeKeyValue(doc, "Odometer", String(vehicle.odometerReading ?? 0), 365, 270);

    doc.roundedRect(40, 325, 515, 92, 8).strokeColor("#d1d5db").stroke();
    doc.fontSize(12).fillColor("#111827").text("Job Card & Service Record", 55, 337);
    writeKeyValue(doc, "Job Card Status", jobCard.status, 55, 355);
    writeKeyValue(doc, "Priority", jobCard.priority, 210, 355);
    writeKeyValue(doc, "Service Date", formatDate(serviceRecord.serviceDate), 365, 355);
    writeKeyValue(doc, "Next Service Date", formatDate(serviceRecord.nextServiceDate), 55, 380);
    writeKeyValue(doc, "Next Service Km", serviceRecord.nextServiceKm ?? "-", 210, 380);

    doc.roundedRect(40, 430, 515, 135, 8).strokeColor("#d1d5db").stroke();
    doc.fontSize(12).fillColor("#111827").text("Charges", 55, 442);

    const rows = [
        ["Labour Charge", invoice.labourCharge],
        ["Parts Charge", invoice.partsCharge],
        ["Tax Amount", invoice.taxAmount],
        ["Discount Amount", invoice.discountAmount],
        ["Total Amount", invoice.totalAmount],
    ];

    let rowY = 465;
    rows.forEach(([label, value], index) => {
        doc.fontSize(10).fillColor(index === rows.length - 1 ? "#111827" : "#374151").text(label, 55, rowY, { width: 180 });
        doc.fontSize(10).fillColor(index === rows.length - 1 ? "#111827" : "#374151").text(`Rs. ${money(value)}`, 430, rowY, { width: 100, align: "right" });
        rowY += 20;
    });

    if (jobCard.complaints && jobCard.complaints.length) {
        doc.addPage();
        doc.fontSize(14).fillColor("#111827").text("Complaints", { underline: true });
        doc.moveDown(0.5);
        jobCard.complaints.forEach((complaint, index) => {
            doc.fontSize(11).fillColor("#374151").text(`${index + 1}. ${complaint}`);
        });
        doc.moveDown(0.5);
    }

    if (jobCard.inspectionNotes || serviceRecord.remarks) {
        doc.addPage();
        doc.fontSize(14).fillColor("#111827").text("Inspection Notes & Remarks", { underline: true });
        doc.moveDown(0.5);
        if (jobCard.inspectionNotes) {
            doc.fontSize(11).fillColor("#374151").text(`Inspection Notes: ${jobCard.inspectionNotes}`);
            doc.moveDown(0.3);
        }
        if (serviceRecord.remarks) {
            doc.fontSize(11).fillColor("#374151").text(`Service Remarks: ${serviceRecord.remarks}`);
        }
    }
};

export const createInvoicePdfStream = (context) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    writeInvoiceBody(doc, context);
    doc.end();
    return doc;
};

export const createInvoicePdfBuffer = (context) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        writeInvoiceBody(doc, context);
        doc.end();
    });
};

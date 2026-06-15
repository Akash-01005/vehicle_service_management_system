import mongoose from "mongoose";

const allowedRoles = ["owner", "admin", "service_advisor", "mechanic"];

export default function validateRegister(req, res, next) {
  const errors = [];
  const { garageId, firstName, lastName, email, phone, password, role, avatar } = req.body || {};

  if (!garageId || typeof garageId !== "string" || !mongoose.Types.ObjectId.isValid(garageId)) {
    errors.push("garageId is required and must be a valid ObjectId");
  }

  if (!firstName || typeof firstName !== "string" || firstName.trim().length < 2) {
    errors.push("firstName must be a string with at least 2 characters");
  }

  if (lastName !== undefined && lastName !== null && typeof lastName !== "string") {
    errors.push("lastName must be a string if provided");
  }

  if (!email || typeof email !== "string") {
    errors.push("email is required");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push("email must be a valid email address");
    }
  }

  if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
    errors.push("phone is required and must be at least 7 characters long");
  }

  if (!password || typeof password !== "string") {
    errors.push("password is required");
  } else {
    const pwdRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{7,}$/;
    if (!pwdRegex.test(password)) {
      errors.push("password must be longer than 6 characters and include at least one uppercase letter, one number, and one special character");
    }
  }

  if (role !== undefined && role !== null && !allowedRoles.includes(role)) {
    errors.push(`role must be one of: ${allowedRoles.join(", ")}`);
  }

  if (avatar !== undefined && avatar !== null && typeof avatar !== "string") {
    errors.push("avatar must be a string if provided");
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: errors,
    });
  }

  next();
}

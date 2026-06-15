import nodemailer from 'nodemailer';


const emailServer = (email, token) =>{
     try{
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        let mailOptions = {
            from: process.env.SENDING_MAIL,
            to: email,
            subject: 'Reset Your Password',
            text: `Hello,
                We received a request to reset the password for your account.
                To reset your password, please click the link below:

               http://localhost:3000/api/auth/reset-password/${token}

                For your security, this link is valid for 5 minutes only and can be used once. If the link expires, you can request a new password reset link at any time.
                If you did not request this password reset, please ignore this email. No changes will be made to your account.

                Thank you,
                The XYZ support Team`
        };

        transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
        });
     }catch(error){
        console.error('Error setting up email server:', error);
     }
}

export default emailServer;
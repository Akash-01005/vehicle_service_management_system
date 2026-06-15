export default function validateRegister(req, res, next) {
  const errors = [];
  const { userName, email, password } = req.body || {};

  if (!userName || typeof userName !== 'string' || userName.trim().length < 3) {
    errors.push('userName must be a string with at least 3 characters');
  }

  if (!email || typeof email !== 'string') {
    errors.push('email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) errors.push('email must be a valid email address');
  }

  if (!password || typeof password !== 'string') {
    errors.push('password is required');
  } else {
    const pwdRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{7,}$/;
    if (!pwdRegex.test(password)) {
      errors.push('password must be longer than 6 characters and include at least one uppercase letter, one number, and one special character');
    }
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: errors
    });
  }

  next();
}

export const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = null;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map(e => e.message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    message = `${Object.keys(err.keyPattern)[0]} already exists`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  // Log for debugging (server-side only)
  console.error('Error:', err);

  // Send client-friendly response
  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }) 
  });
};
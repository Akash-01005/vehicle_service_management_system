import jwt from 'jsonwebtoken';

const { sign } = jwt;

const generateToken = (payload, secretKey, expiryTime) => {
  const token = sign(payload, secretKey, { expiresIn: expiryTime, algorithm: 'HS256'});
  return token;
}

export default generateToken;
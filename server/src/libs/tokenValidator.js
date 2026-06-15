import jwt from 'jsonwebtoken';

const { verify } = jwt;

const validateToken = (token,secretKey) => {
  try {
        const decoded = verify(token, secretKey);  
        return decoded; 
    } catch (error) {
        console.error('Invalid token:', error);
        return null; 
    }
}

export default validateToken;
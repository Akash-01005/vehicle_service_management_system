import { decode } from 'jsonwebtoken';
import validateToken from '../libs/tokenValidator.js';

const authMiddleware = async (req,res,next) =>{
     try{
      const token = req.cookies.accessToken;
        const secretKey = process.env.SECRET_KEY;
        if(!validateToken(token,secretKey)){
         const error = new Error('Unauthorized!! No access token provided');
            error.statusCode = 401;
            return next(error);
        }
        const decodedToken = decode(token);
        req.userID = decodedToken.userId;
        req.userRole = decodedToken.role;
        req.garageID = decodedToken.garageId;
        next();
     }catch(error){
        console.error('Error in auth middleware:', error);
        const err = new Error('Unauthorized!! Invalid token');
        err.statusCode = 401;
        next(err);
     }
}

export default authMiddleware;
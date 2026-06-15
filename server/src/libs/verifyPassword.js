import { compare } from 'bcrypt';

const verifyPassword = async (password, hashedPassword) => {
    try {
        const isMatch = await compare(password, hashedPassword);
        return isMatch;
    } catch (error) {
        console.error('Error verifying password:', error);
        throw error;
    }   
}

export default verifyPassword;
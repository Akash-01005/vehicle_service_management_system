import hash from 'bcrypt';

const hashPassword = async (password, saltRounds) => {
    try {
        const hashedPassword = await hash.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error;
    }
}

export default hashPassword;
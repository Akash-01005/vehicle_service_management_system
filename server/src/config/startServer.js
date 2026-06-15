import app from '../app.js';

const startServer = () => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT,() =>{
      console.log(`Server is running on port ${process.env.PORT || 3000}...`);
    });
}

export default startServer;

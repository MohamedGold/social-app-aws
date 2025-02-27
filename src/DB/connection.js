import mongoose from "mongoose";



export const database_connect = async () => {
    try {
        await mongoose.connect(process.env.DB_URI);
        console.log('Database connected');

    } catch (error) {
        console.log(`Error in DB connection: ${error}`);
    }   
  };


  


  
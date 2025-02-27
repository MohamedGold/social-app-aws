
import path from "node:path";
import fs from "node:fs";
import multer from 'multer';



export const fileValidations = {
  image: ["image/jpeg", "image/png", "image/gif"],
  document: ["application/pdf", "application/msword"]
};

// export const uploadFileDisk = (customPath = "general", fileValidation = []) => {

//   const basePath = `uploads/${customPath}`;
//   const fullPath = path.resolve(`./src/${basePath}`);

//   console.log({ basePath, fullPath, checkPath: fs.existsSync(fullPath) });


//   if (!fs.existsSync(fullPath)) {
//     fs.mkdirSync(fullPath, { recursive: true });
//   }

//   const storage = multer.diskStorage({
//     destination: (req, file, cb) => {

//       cb(null, fullPath);
//     },
//     filename: (req, file, cb) => {
//       console.log({ file });

//       const finalFileName = Date.now() + '-' + Math.round(Math.random() * 1E9) + file.originalname;

//       file.finalPath = basePath + "/" + finalFileName;

//       cb(null, finalFileName);
//     }
//   });

//   function fileFilter(req, file, cb) {

//     if (fileValidation.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb("In-valid file format ", false);
//     }
//   }

//   return multer({ dest: "tempPath", fileFilter, storage });
// };
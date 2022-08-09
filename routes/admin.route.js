const router = require('express').Router();

/** Database functions */
const { getConnection, closeConnectionMongoose } = require("../lib/mongoose/dbConnect");
const { 
  getModel, 
  findOneByEmailMongoose,
  findByIdAndUpdateMongoose,
  createUserCredentialMongoose, 
  createDocumentMongoose,
  createVerificationMongoose,
  findByIdMongoose,
} = require("../lib/mongoose/dbModel");
const { userSchema } = require("../models/User");
const { accountSchema } = require("../models/Account");
const { airbnbSchema } = require("../models/Airbnb");

/** Utils */
const axios = require('axios').default;
const jwt = require("jsonwebtoken");
const assert = require("assert")
const multer  = require('multer')
const DatauriParser = require('datauri/parser');
const { uploadImage, deleteImage } = require('../lib/cloudinary')

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const dbName = process.env.ZULAR_DB

async function doesSocketAgree( io, data ){
  return new Promise((resolve, reject) => {
    io.timeout(5000).emit("data_list_incoming", data, (err, response) => {
      if (err) {
        console.log(err)
        reject(err)
      } else {
        //console.log(response);
        resolve(response);
      }
    });
  });

}

// Create wrapper function that will adjust router based on provided configuration
var wrapper = function (io) {
  router.all('/:id/get-users', async (req, res, next) => {
    const {
      method,
      params: { id },
      body,
    } = req;
    let connDb
    let sessionMongo

    switch (method) {
      case "GET":
        connDb = await getConnection(process.env.ZULAR_DB)  
        let Airbnb = getModel("listingsAndReview", airbnbSchema, connDb)
        let User = getModel("User", userSchema, connDb)
        
        const cursor = await Airbnb.find().cursor()
        let count = 0
        //io.to(id).emit("data_list_incoming", cursor.next());
        
        
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
          //io.to(id).emit("data_list_incoming", doc);
          await doesSocketAgree(io, doc)
          count = count + 1
          console.log(count)
        }
        
        return res.status(201).json({success:'success'})
      case "PUT":
        try {
          /** Alert by sockets */
          io.to(id).emit("alert_snackbar", {
            variant: 'info',
            text: 'Processing',          
          });

          /** Database process */
          connDb = await getConnection(dbName)
          let User = getModel("User", userSchema, connDb)
          let Account = getModel("Account", accountSchema, connDb)          
          let userDoc = await User.findById(id)
          
          sessionMongo = await connDb.startSession();    
          sessionMongo.startTransaction();

          let newAccountDoc = await findByIdAndUpdateMongoose(Account, userDoc.accountId, body, sessionMongo)
          assert.ok( newAccountDoc );
          
          await sessionMongo.commitTransaction();
          sessionMongo.endSession();

          /** Update Front data and alert by sockets  */
          io.to(id).emit("data_incoming", newAccountDoc);
          io.to(id).emit("alert_snackbar", {
            variant: 'success',
            text: 'Data Upload',          
          });

          return res.status(201).json(newAccountDoc) 
        }         
        catch (error) {
          console.log(error)
          if (typeof sessionMongo !== "undefined") {
            await sessionMongo.abortTransaction();
          }
          /** Alert by sockets */
          io.to(id).emit("alert_snackbar", {
            variant: 'error',
            text: 'Error',          
          });

          return res.status(500).json({ msg: error.message });
        }
        finally {
          if (typeof sessionMongo !== "undefined") {  
            await sessionMongo.endSession();
          }
          /** Alert by sockets */
          io.to(id).emit("alert_backdrop", false);
        
          // Close the connection to the MongoDB cluster
          //await closeConnectionMongoose(connDb)
        }
        default:
          return res.status(401).json({ msg: "This method is not supported" });
    }
  });
  
  router.all('/:id/files', upload.any(), async (req, res, next) => {
    const {
      method,
      params: { id },
      body,
      files,
    } = req;    
    let connDb
    let sessionMongo
    let session
    
    switch (method) {
      case "GET":
        return res.status(201).json({success:'success'})
      case "PUT":
        let fieldname 
        try {
          if ( !files || files.length < 1 ) {
            return res.status(401).json({ msg: "Not files detected" });  
          }
          /** Alert by sockets */
          io.to(id).emit("alert_snackbar", {
            variant: 'info',
            text: 'Uploading file...',          
          });
            
          const parser = new DatauriParser();
          let newAccountDoc

          for (let file of files) {
            /** Upload file to cloud */
            fieldname = file.fieldname
            const datauri = parser.format(file.mimetype, file.buffer);
            let res_cloud = await uploadImage(datauri.content, { public_id: `${id}-${file.fieldname}`})
            
            if ( !res_cloud ) {
              throw("Upload file fail")
            }
            let img = { 
              [file.fieldname] : {
                public_id: res_cloud.public_id,
                secure_url: res_cloud.secure_url
              }
            }
            /** Database process */
            connDb = await getConnection(dbName)
            let User = getModel("User", userSchema, connDb)
            let Account = getModel("Account", accountSchema, connDb)          
            let userDoc = await User.findById(id)
            
            sessionMongo = await connDb.startSession();    
            sessionMongo.startTransaction();
            
            newAccountDoc = await findByIdAndUpdateMongoose(Account, userDoc.accountId, img, sessionMongo)
            assert.ok( newAccountDoc );
            
            await sessionMongo.commitTransaction();
            sessionMongo.endSession();

          }          
          /** Update Front data and alert by sockets  */
          io.to(id).emit("data_incoming", newAccountDoc);

          /** Alert data upload success by sockets  */
          io.to(id).emit("alert_snackbar", {
            variant: 'success',
            text: 'Data Upload',          
          });
          return res.status(201).json(newAccountDoc) 
        }         
        catch (error) {
          console.log(error)
          if (typeof sessionMongo !== "undefined") {
            await sessionMongo.abortTransaction();
          }
          /** Alert by sockets */
          io.to(id).emit("alert_snackbar", {
            variant: 'error',
            text: 'Error',          
          });
          io.to(id).emit("fail_upload", fieldname);

          return res.status(500).json({ msg: error.message });
        }
        finally {
          if (typeof sessionMongo !== "undefined") {  
            await sessionMongo.endSession();
          }
          /** Alert by sockets */
          io.to(id).emit("alert_backdrop", false);
        
          // Close the connection to the MongoDB cluster
          //await closeConnectionMongoose(connDb)
        }
      case "DELETE":
        try {
          /** Alert by sockets */
          io.to(id).emit("alert_snackbar", {
            variant: 'info',
            text: 'Changing...',          
          });

          const nameProperty = Object.keys(body)[0]
          let newAccountDoc

          let img = JSON.parse(JSON.stringify(body))
          img[nameProperty].public_id = ""
          img[nameProperty].secure_url = ""

          /** Database process */
          connDb = await getConnection(dbName)
          let User = getModel("User", userSchema, connDb)
          let Account = getModel("Account", accountSchema, connDb)          
          let userDoc = await User.findById(id)
          
          sessionMongo = await connDb.startSession();    
          sessionMongo.startTransaction();
          
          newAccountDoc = await findByIdAndUpdateMongoose(Account, userDoc.accountId, img, sessionMongo)
          assert.ok( newAccountDoc );
          
          await sessionMongo.commitTransaction();
          sessionMongo.endSession();
          sessionMongo = undefined

          /** Update Front data and alert by sockets  */
          io.to(id).emit("data_incoming", newAccountDoc);

          /** Remove file form cloud */
          let res_cloud = await deleteImage(body[nameProperty].public_id)
          
          if ( !res_cloud ) {
            throw("Delete file fail")
          }
          /** Alert data upload success by sockets  */
          io.to(id).emit("alert_snackbar", {
            variant: 'success',
            text: 'Success',          
          });
          return res.status(201).json(newAccountDoc) 
        }         
        catch (error) {
          console.log(error)
          if (typeof sessionMongo !== "undefined") {
            await sessionMongo.abortTransaction();
          }
          /** Alert by sockets */
          io.to(id).emit("alert_snackbar", {
            variant: 'error',
            text: 'Error',          
          });

          return res.status(500).json({ msg: error.message });
        }
        finally {
          if (typeof sessionMongo !== "undefined") {  
            await sessionMongo?.endSession();
          }
          /** Alert by sockets */
          io.to(id).emit("alert_backdrop", false);
        
          // Close the connection to the MongoDB cluster
          //await closeConnectionMongoose(connDb)
        }
        default:
        return res.status(401).json({ msg: "This method is not supported" });
    }
  });

  return router
}

module.exports = wrapper;

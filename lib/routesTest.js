/*
   Copyright 2016, Google, Inc.
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

'use strict';

var google = require('googleapis');
var authentication = require("../security/authentication");

var assign = require('lodash').assign;
var express = require('express');

var router = express.Router();
var values = require('lodash').values;

// Gabriel
var async = require('async');

var routes = function (storageClient, cloudVisionClient) {
  var defaultContext = {
    featureTypes: values(cloudVisionClient.featureTypes)
  };

  router.get('/', function (req, res) {
    res.render('base', defaultContext);
  });

  router.post('/',
    storageClient.multer.single('image'),
    storageClient.uploadToStorage,
    function (req, res) {
      var context = {
        vision: {}
      };

      if (req.file && req.file.cloudStoragePublicUrl) {
        cloudVisionClient.detectImage(
          req.file.cloudStorageUri,
          req.body.imageType,
          req.body.maxResults,
          function (error, response) {
            if (error) {
              context.error = error;
            } else {
              // Indent 2 spaces the json response if exists.
              context.vision.prettyprint = response ?
                JSON.stringify(response, null, 2) : null;
              context.vision.imageUrl = req.file.cloudStoragePublicUrl;
              context.vision.response = JSON.stringify(response.responses);
            }

            // Gabriel  
            console.log("Calling Google Sheet!");


            //  Gabriel console.log (context.vision.response);
            var myResponse = response.responses;
            //  console.log(context.vision.response.textAnnotations);

            var myGSheetSelected = ['Anumite Data care vin din Google Vision', 'Emitent', 'GAZSUD'];
            var myGSheetAll = ['Toate Datele care vin din Google Vision'];
            var regEx = /(^factura:$|^emiterii:$|^locatie:$|^SC$|$consumator:$|^IBAN:$|^C.U.I.:$|^Com.\/an$|^Romania$|^Banca:$|\w{2}\d{6}$|\d{2}\d{2}\d{2}\d{4})/;
            // sendToGSheet(myGSheetRaw);

            var i;
            for (i = 1; i < myResponse[0].textAnnotations.length; i++) {

              console.log("inside for");
              
              try {

                if (regEx.test(myResponse[0].textAnnotations[i].description)) {

                  console.log("start switch");
                  switch (myResponse[0].textAnnotations[i].description) {


                   // case "Romania":
                   //  myResponse[0].textAnnotations[i].description = "Emitent:"
                   //   console.log("emitent found");
                   //   break;

                    case "locatie:":
                      myResponse[0].textAnnotations[i].description = "Data scadenta:"
                      break;
                    case "Com./an":
                      myResponse[0].textAnnotations[i].description = "Cod comercial:"
                      break;
                    case "emiterii:":
                      myResponse[0].textAnnotations[i].description = "Data emiterii:"
                      break;

                    case "factura:":
                      myResponse[0].textAnnotations[i].description = "Nr. Factura:"
                      break;

                    case "Citire:":
                      myResponse[0].textAnnotations[i].description = "Serie Contor"
                      break;


                    default:
                      myResponse[0].textAnnotations[i].description
                  }


                  
                  myGSheetSelected.push(myResponse[0].textAnnotations[i].description);                  
                  myGSheetSelected.push(myResponse[0].textAnnotations[i+1].description);

                  console.log(myResponse[0].textAnnotations[i].description);
                  console.log(myResponse[0].textAnnotations[i+1].description);

                };


              } catch (error) {
                console.log("errors undefined");
              }






             // console.log(myGSheetRaw);

            }

            

            for (i = 1; i < myResponse[0].textAnnotations.length; i++) {


              myGSheetAll.push(myResponse[0].textAnnotations[i].description); 
              console.log(myResponse[0].textAnnotations[i].description);


            }

            sendToGSheet(myGSheetSelected, 'Sheet1');
            sendToGSheet(myGSheetAll, 'AllData');



            res.render('base', assign(context, defaultContext));
          }
        );
      } else {
        context.error = 'Something went wrong uploading the image!';
        res.render('base', assign(context, defaultContext));
      }
    });

  return router;
};

// added by Gabriel
function sendToGSheet(pDescription,pSheet) {
  console.log("Inside Function sendToGSheet");

  function appendData(auth) {
    var sheets = google.sheets('v4');
    sheets.spreadsheets.values.append({
      auth: auth,
      spreadsheetId: '14e1q3ZZ5WChC553i_lyxunOWmcDb7upPwIL9mlTH2P8',
      range: pSheet+'!A:Z', //Change Sheet1 if your worksheet's name is something else
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: {
        majorDimension: "COLUMNS",
        values: [pDescription]
      }
    }, (err, response) => {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      } else {
        console.log("Appended");
      }
    });
  }

  authentication.authenticate().then((auth) => {
    appendData(auth);
  });


};

module.exports = routes;
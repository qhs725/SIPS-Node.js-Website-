
//Model for uploads

var Cloudant = require('cloudant');
var ibmdb = require('ibm_db');
var uuid = require('node-uuid');
var qs = require('qs');

var env = null;
var key = null;
var keySql = null;

//Service to get account information for
var serviceName = 'CLOUDANTNOSQLDB';
var serviceName2 = 'SQLDB';

//VCAP_SERVICES
function findKey(obj, lookup) {
    for (var i in obj) {
        if (typeof(obj[i]) === "object") {
            if (i.toUpperCase().indexOf(lookup) > -1) {
                // Found the key
                console.log("Key was found");
                return i;
            }
            findKey(obj[i], lookup);
        }
    }
    return -1;
}
if (process.env.VCAP_SERVICES) {
    env = JSON.parse(process.env.VCAP_SERVICES);
    key = findKey(env, serviceName);
    keySql = findKey(env, serviceName2);
}

//Get Bluemix Cloudant account credentials
var credentials = env[key][0].credentials;
var me = credentials.username;
var password = credentials.password;

//Get Bluemix SQL Database account credentials
var credentialsSQL = env[keySql][0].credentials;
var dsnString = "DRIVER={DB2};DATABASE=" + credentialsSQL.db + ";UID=" + credentialsSQL.username + ";PWD=" +
    credentialsSQL.password + ";HOSTNAME=" + credentialsSQL.hostname + ";port=" + credentialsSQL.port;


// Initialize Cloudant library.
var cloudant = Cloudant({account: me, password: password});

// Specify a cloudant database to be used
var datapoints = cloudant.db.use('sampletaskdb');

module.exports = {
    userCheckUpload: userCheckUpload,
    taskDataUploadSQLMultiTable: taskDataUploadSQLMultiTable,
    taskDataUploadCloudant: taskDataUploadCloudant,
    sportsFormEntry: sportsFormEntry
}

//Checks of data is form or task data, if user exists, and then calls function based on data type
function userCheckUpload(msg) {
    if(msg.type == "Sports Fitness & Injury Form"){
        var userid = msg.id;
    }
    else{
        var userid = msg.USERID;
    }



    ibmdb.open(dsnString, function (err, conn) {
        if (err) {
            response.write("error: ", err.message + "<br>\n");
            response.end();
            console.log("ERROR Test of VCAP_SERVICES ERROR");
        } else {
            console.log("Test of VCAP_SERVICES");


            var obj = conn.querySync("select count(*) from USER WHERE UserID = \'" + userid + "\'");
            str = JSON.stringify(obj, null, 2)
            newUser = str.charAt(15);
            console.log("New user?: " + newUser);


            //Inserts new user if doesn't exist
            if (newUser == 0 || newUser == "0") {

                var dateObj = new Date();
                var month = dateObj.getUTCMonth() + 1;
                var day = dateObj.getUTCDate();
                var year = dateObj.getUTCFullYear();

                var date = year + "-" + month + "-" + day;

                console.log("New User Create: " + userid);
                console.log("Date: " + date);

                conn.prepare("INSERT INTO USER (UserID, dateAdded) VALUES (?, ?)", function (err, stmt) {
                    if (err) {
                        console.log("ERROR: " + err);
                        return conn.closeSync();
                    }

                    stmt.execute([userid, date], function (err, result) {
                        if (err) {
                            console.log("ERROR: " + err);
                        }
                        else {
                            console.log("New user created");
                            result.closeSync();

                            if(msg.type == "Sports Fitness & Injury Form") {
                                sportsFormEntry(msg);
                            }
                            else{
                                taskDataUploadSQLMultiTable(msg);
                            }
                        }
                    });
                });
            }
            else {
                console.log("User exists");

                if(msg.type == "Sports Fitness & Injury Form") {
                    sportsFormEntry(msg);
                }
                else{
                    //taskDataUploadCloudant(msg);
                    taskDataUploadSQLMultiTable(msg);
                }
            }
        }
    });
};

function taskDataUploadCloudant (msg) {
    var keyNames = Object.keys(msg);

    //Print out key names to verify session object loaded
    for (var i in keyNames) {
        console.log("msg." + keyNames[i] + " in WebApp");
    }
    // Insert a document into cloudant database specified above.
    datapoints.insert(msg, function (err, body, header) {
        if (err) {
            console.log('[session.insert] ', err.message);
            return false;
        }
        else {
            console.log('Insertion completed without error')
            return true;
        }
    });
};

function taskDataUploadSQLMultiTable(msg) {
    ibmdb.open(dsnString, function (err, conn) {
        if (err) {
            response.write("error: ", err.message + "<br>\n");
            response.end();
            console.log("ERROR Test of VCAP_SERVICES ERROR");
        } else {
            console.log("Test of VCAP_SERVICES");

            var taskEntryID = uuid.v1();
            var userID = msg.USERID;
            var sessionID = msg.SESSIONID;
            var userInput = msg.USERINPUT;

            var dateObj = new Date();
            var month = dateObj.getUTCMonth() + 1;
            var day = dateObj.getUTCDate();
            var year = dateObj.getUTCFullYear();
            var date = year + "-" + month + "-" + day;

            var accelx = (msg.ACCELX.substring(1, msg.ACCELX.length - 1)).split(",");
            var accely = (msg.ACCELY.substring(1, msg.ACCELY.length - 1)).split(",");
            var accelz = (msg.ACCELZ.substring(1, msg.ACCELZ.length - 1)).split(",");
            var tstmpA = (msg.ACCELTIMESTAMP.substring(1, msg.ACCELTIMESTAMP.length - 1)).split(",");
            var gyrox = (msg.GYROX.substring(1, msg.GYROX.length - 1)).split(",");
            var gyroy = (msg.GYROY.substring(1, msg.GYROY.length - 1)).split(",");
            var gyroz = (msg.GYROZ.substring(1, msg.GYROZ.length - 1)).split(",");
            var tstmpG = (msg.GYROTIMESTAMP.substring(1, msg.GYROTIMESTAMP.length - 1)).split(",");
            var magx = (msg.MAGX.substring(1, msg.MAGX.length - 1)).split(",");
            var magy = (msg.MAGY.substring(1, msg.MAGY.length - 1)).split(",");
            var magz = (msg.MAGZ.substring(1, msg.MAGZ.length - 1)).split(",");
            var tstmpM = (msg.MAGTIMESTAMP.substring(1, msg.MAGTIMESTAMP.length - 1)).split(",");

            var appSensorData = accelx.length > 0 ? 1 : 0;

            var lo = 0;
            //Preparing to excecute SQL command, ? are placements for values given in the execute command
            conn.prepare("INSERT INTO TaskEntryList ( TaskEntryID, USERID, TaskNotes, appSensorData, DateAdded) VALUES ( ?, ?, ?, ?, ?)", function (err, stmt) {
                if (err) {
                    console.log(err);
                    return conn.closeSync();
                }
                stmt.execute([taskEntryID, String(userID), String(userInput), appSensorData, date], function (err, result) {
                    if (err) {
                        console.log("ERROR: " + err);
                    }
                    else {

                        //Preparing to excecute SQL command, ? are placements for values given in the execute command
                        conn.prepare("INSERT INTO AppSensorData (TaskEntryID, ACCELTIMESTAMP, ACCELX, ACCELY, ACCELZ,  GYROTIMESTAMP, GYROX, GYROY, GYROZ, MAGTIMESTAMP, MAGX, MAGY, MAGZ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", function (err, stmt) {
                            if (err) {
                                console.log(err);
                                return conn.closeSync();
                            }

                            console.log("SQL prepare command  - - DONE");

                            //Send data to database
                            for (var i = 0; i < tstmpA.length; i++) {
                                lo++;
                                try {
                                    //Check if values are undefined at the position, if it is defined then check if null and if so add 0
                                    if (magx[i] === 'undefined') {
                                        magx.push("0");
                                    }
                                    else {
                                        magx[i] = magx[i] != null ? magx[i] : "0";
                                    }
                                    if (magy[i] === 'undefined') {
                                        magx.push("0");
                                    }
                                    else {
                                        magy[i] = magy[i] != null ? magy[i] : "0";
                                    }
                                    if (magz[i] === 'undefined') {
                                        magz.push("0");
                                    }
                                    else {
                                        magz[i] = magz[i] != null ? magz[i] : "0";
                                    }
                                    if (tstmpM[i] === 'undefined') {
                                        tstmpM.push("0");
                                    }
                                    else {
                                        tstmpM[i] = tstmpM[i] != null ? tstmpM[i] : "0";
                                    }
                                    if (gyrox[i] === 'undefined') {
                                        gyrox.push("0");
                                    }
                                    else {
                                        gyrox[i] = gyrox[i] != null ? gyrox[i] : "0";
                                    }
                                    if (gyroy[i] === 'undefined') {
                                        gyroy.push("0");
                                    }
                                    else {
                                        gyroy[i] = gyroy[i] != null ? gyroy[i] : "0";
                                    }
                                    if (gyroz[i] === 'undefined') {
                                        gyroz.push("0");
                                    }
                                    else {
                                        gyroz[i] = gyroz[i] != null ? gyroz[i] : "0";
                                    }
                                    if (tstmpG[i] === 'undefined') {
                                        tstmpG.push("0");
                                    }
                                    else {
                                        tstmpG[i] = tstmpG[i] != null ? tstmpG[i] : "0";
                                    }
                                    if (accelx[i] === 'undefined') {
                                        accelx.push("0");
                                    }
                                    else {
                                        accelx[i] = accelx[i] != null ? accelx[i] : "0";
                                    }
                                    if (accely[i] === 'undefined') {
                                        accely.push("0");
                                    }
                                    else {
                                        accely[i] = accely[i] != null ? accely[i] : "0";
                                    }
                                    if (accelz[i] === 'undefined') {
                                        accelz.push("0");
                                    }
                                    else {
                                        accelz[i] = accelz[i] != null ? accelz[i] : "0";
                                    }
                                    if (tstmpA[i] === 'undefined') {
                                        tstmpA.push("0");
                                    }
                                    else {
                                        tstmpA[i] = tstmpA[i] != null ? tstmpA[i] : "0";
                                    }

                                    console.log(i + " - of - " + tstmpA.length); //Shows progress when uploading

                                    stmt.execute([taskEntryID, parseFloat(tstmpA[i]), parseFloat(accelx[i]), parseFloat(accely[i]), parseFloat(accelz[i]), parseFloat(tstmpG[i]), parseFloat(gyroy[i]), parseFloat(gyroy[i]), parseFloat(gyroz[i]), parseFloat(tstmpM[i]), parseFloat(magx[i]), parseFloat(magy[i]), parseFloat(magz[i])], function (err, result) {
                                        if (err) {
                                            console.log("ERROR: " + lo);
                                            console.log(err);
                                        }
                                        else {

                                            result.closeSync();
                                        }

                                    });

                                } catch (err) {
                                    console.log("ERROR: " + err.message);
                                }
                            };

                            console.log("Upload completed");
                        })
                    }
                });
            });
        }
    });
};


function  sportsFormEntry(req) {
    console.log("USER: " + JSON.stringify(req.id, null, 2));
    var data = req;
    //Original form data from POST
    //console.log(data);

    var userid = req.id;
    var formEntryID = uuid.v1();

    var dateObj = new Date();
    var month = dateObj.getUTCMonth() + 1;
    var day = dateObj.getUTCDate();
    var year = dateObj.getUTCFullYear();
    var date = year + "-" + month + "-" + day;


    //Parse data to Object type
    var question = qs.parse(data);
    console.log(question);

    ibmdb.open(dsnString, function (err, conn) {
        if (err) {
            console.log("SQL ERROR: " + err.message);
            check = false;
        } else {

            //Adds form entry to list of table of form entries
            conn.prepare("INSERT INTO FormEntryList (formentryID, userID, formType, dateAdded) VALUES (?, ?, ?, ?)", function (err, stmt) {
                if (err) {
                    console.log("ERROR: " + err);
                    return conn.closeSync();
                }
                stmt.execute([formEntryID, userid, 'SPORTSFITNESSINJURY', date], function (err, result) {
                    if (err) {
                        console.log("ERROR: " + err);
                    }
                    else {
                        console.log("New Sport Form Entry added to FORMENTRYLIST");

                        //Inserts static Form answers to appropriate table
                        conn.prepare("INSERT INTO SportsFitnessForm (formentryID, dateAdded, question1, question2, question3, question4, question5, question6, question7, question8, question9, question10, question11, concussion, INJURYSUSTAINED) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", function (err, stmt) {
                            if (err) {
                                console.log("ERROR: " + err);
                                return conn.closeSync();
                            }

                            stmt.execute([formEntryID, date, parseInt(question.arr[1]), parseInt(question.arr[2]), parseInt(question.arr[3]), parseInt(question.arr[4]), parseInt(question.arr[5]), parseInt(question.arr[6]), parseInt(question.arr[7]), parseInt(question.arr[8]), parseInt(question.arr[9]), parseInt(question.arr[10]), parseInt(question.arr[11]), parseInt(question.arr[12]), parseInt(question.arr[13])], function (err, result) {
                                if (err) {
                                    console.log("ERROR: " + err);
                                }
                                else {
                                    console.log("SportFitnessForm table updated");

                                    conn.prepare("INSERT INTO Injuries (formentryID, Location, Type, TypeSpecific, CustomType, TimeLoss, dateAdded) VALUES (?, ?, ?, ?, ?, ?, ?)", function (err, stmt) {
                                        if (err) {
                                            console.log("ERROR: " + err);
                                            return conn.closeSync();
                                        }

                                        //Handle Dynamic injury questions
                                        var t = 0;
                                        var injuryCount = 0;
                                        for (var i = 13; i > -1; i++) {
                                            //Collect for each injury that exists
                                            var isInjury = parseInt(question.arr[i]);
                                            if (isInjury == 0 || isInjury === 'undefined' || injuryCount > 30) {
                                                console.log("No more injuries entered");
                                                break;
                                            }

                                            var location = parseInt(question.arr[i + 1]);
                                            var typeSpecific = parseInt(question.arr[i + 2]);
                                            var type = "null";
                                            var customType = "null";
                                            var timeLoss = parseInt(question.arr[i + 3]);
                                            if (typeSpecific <= 3) {
                                                type = 0; //Sudden
                                            }
                                            else if (typeSpecific == 6) {
                                                console.log("typeSpecific is: " + typeSpecific);
                                                customType = question.arr_1[injuryCount] + "";
                                                type = -1; //custom input
                                                t++;
                                            }
                                            else {
                                                type = 1; //Gradual
                                            }


                                            console.log("Injury Count: " + injuryCount);
                                            console.log("next Injury?: " + isInjury + " at " + i);
                                            console.log("location: " + location + " at " + (i + 1));
                                            console.log("type: " + type);
                                            console.log("typeSpecific: " + typeSpecific + "at" + (i + 3))
                                            console.log("customType: " + customType + " at " + t);
                                            console.log("Injury timeLoss: " + timeLoss + " at " + (i + 4));
                                            i = i + 3;
                                            injuryCount++;

                                            stmt.execute([formEntryID, location, type, typeSpecific, customType, timeLoss, date], function (err, result) {
                                                if (err) {
                                                    console.log("ERROR: " + err);
                                                }
                                                else {
                                                    console.log("New injury added by User");
                                                    //  result.closeSync();
                                                }
                                            });
                                        }
                                    });
                                    // result.closeSync();
                                }
                            });
                        });
                        result.closeSync();
                    }
                });
            });


            //prints out static questions
            for (var y = 0; y < 12; y++) {
                if (question.arr[y]) {
                    console.log('Question ' + y + ': ' + question.arr[y]);
                }
            }


        }
    });
}
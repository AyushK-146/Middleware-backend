const { urlencoded } = require('express');
const express = require('express');
const fast2sms = require('fast-two-sms')
const app = express();
const cors = require("cors");
const pool = require('./db');
var fileSystem = require("fs");
const { format } = require('@fast-csv/format');
const translate = require("translate");
translate.engine = "google";
translate.key = process.env.TRANSLATE_KEY;

require('dotenv').config();
const port = 3000;

// Middlewares

app.use("/public", express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());


// Find slang in local language - Task 1
async function findSlang(req, res, next) {
    console.log(req.query);
    try{
        const text = await translate(req.query.word, req.query.lang);
        // e.g. req.query.lang = 'hi' (Hindi) 
        // req.query.word = "Awesome" (English - auto detection)
        res.send(text); // Jhakaas
    }
    catch(err){
        res.send(err.message); 
    }
    next();
};

// Export data in csv - Task 3
async function exportCSV(req, res) {
    try {
        const { rows } = req.body;
        if (!rows) {
            res.status(418).send({message: "`rows` missing"})
        }
        data = rows;

        let csvFile = fileSystem.createWriteStream("./data.csv");
        
        const csvStream = format({ headers: Object.keys(data[0]) });
        csvStream.pipe(csvFile);

        for (let index = 1; index < rows.length; index++) {
            csvStream.write(Object.values(data[index]))
        }

        csvStream.end();

        
        let downloadFile = fileSystem.readFileSync('./data.csv', 'binary');
        res.setHeader('Content-Length', downloadFile.length);
        res.write(downloadFile, 'binary');
        res.end();

    } catch (err) {
        console.log(err.message);
    }
}

// Send SMS middleware - task 4
async function SMS(req, res) {
    try {
        const {client_email, client_name, income_per_annum, savings_per_annum, mobile_number} = req.body;
        var options = { authorization: process.env.API_KEY, message: ` Your Details :\n Email ID :${client_email}\n Name : ${client_name}\n Income Per Annum: ${income_per_annum}\n Savings Per Annum: ${savings_per_annum}\n Contact : ${mobile_number}\n Thankyou for your response`, numbers: [mobile_number] };
        const response = await fast2sms.sendMessage(options); //Asynchronous Function.
        res.send(response.message);
    } catch (err) {
        res.send("Failed to send SMS to the Client");
    }
}


//Routes

// Find slang in local language - task 1
app.get('/getSlang',findSlang, (req, res) => {});

// Validate while insertion of a new client details - task 2
app.post('/validateNew', async (req, res) => {
    const { 
        income_per_annum,
        savings_per_annum
    } = req.body;
    
    if (!income_per_annum) {
        res.status(418).send({message: "`income_per_annum` missing"})
    }
    else if (!savings_per_annum) {
        res.status(418).send({message: "`savings_per_annum` missing"})
    } 
    
    if (savings_per_annum < income_per_annum) {
        res.send("Valid savings");
    } else {
        res.send("Invalid savings");
    }

});

// Validate all and send invalid data to data collector - task 2
app.get('/validateAll', async (req, res) => {
    const { rows } = req.body;

    if (!rows) {
        res.status(418).send({message: "`rows` missing"})
    }
    
    const validate_savings = x => x.savings_per_annum < x.income_per_annum;

    if (rows.every(validate_savings)) {
        res.send("All records are Valid");
    } else {
        res.send("Some records are Invalid");
    }
});

// Get data into csv - task 3
app.get('/getCSV', exportCSV, (req, res) => { });


// Send Message after a response - task 4
app.post('/sendmessage', SMS, (req, res) => { });

app.listen(port, () => {
    console.log(`Server is listening at port : ${port}`);
});
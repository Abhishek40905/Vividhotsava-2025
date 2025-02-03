import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import {connectDB,emailExists,createvvid,getvvid,createCAId,referalCode_exists,checkForMaxEvents} from './database.js';
import { configDotenv } from 'dotenv';
import bodyParser from 'body-parser';
import multer from 'multer';
import nodemailer from "nodemailer";



configDotenv();
const transporter= nodemailer.createTransport(
    {
        secure:true,
        host:'smtp.gmail.com',
        port:465,
        auth:{
            user:process.env.EMAIL,
            pass:process.env.GMAIL_APP_PASS
        }
    }
)

async function sendemail(to,subject,msg){
    transporter.sendMail({
        to:to,
        subject:subject,
        html:msg
    })
}



const app = express();
app.use(bodyParser.json());
const corsOptions = {
    origin: '*',
    methods: 'GET,POST',
    allowedHeaders: ['Content-Type', 'Authorization'],
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);





const upload = multer({ storage: multer.memoryStorage() });
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/checkevents',(req,res)=>{
    const vv_id=req.body;
    let no_of_events=checkForMaxEvents(vv_id);
    if (no_of_events>=5) {
        res.json({registered:true})
    }else{
        res.json({registered:false})
    }
})

function generateSBIpaymentUrl(orderId, amount) {
    return `https://sbiepay.com/payment?orderId=${orderId}&amount=${amount}&callbackUrl=http://localhost:3000/api/payment-callback`;
  }

 


app.post('/api/emaillogin', async(req,res) => {
     const { email } = req.body;
    try {
        const exists = await emailExists(email);
        console.log(exists);
        
        if (exists) {
            let vvid = await getvvid(email);
            res.status(200).json({exists:true,vvid:vvid});  
        }
        else{
            res.status(200).json({ exists: false, vvid: null });
        }
        
    } catch (error) {
        console.error("Failed to check if the email exists:", error);
        res.status(500).json({ exists: false });
    }
});


app.post('/api/registerca', upload.single('collegeId'), async (req, res) => {
    let { name, phone, email, collegeName } = req.body;
    let collegeId = req.file;           
    let background
    console.log(req.file);              
    console.log(req.body);
    console.log(name, phone, email, collegeName);
    let caId= await createCAId();

    try {
        if (!collegeId) {
            return res.status(401).json({ message: "College ID not uploaded" });
        }

        const connection = await connectDB();
        
        const sql = "INSERT INTO CA (caId,name, email, phone, college, collegeId) VALUES (?, ?, ?, ?, ?,?)";
        
        const [result] = await connection.query(sql, [
            caId,
            name,
            email,
            phone,
            collegeName,
            collegeId.buffer 
        ]);

        console.log(result); 

        console.log(`Contingent ambassador successfully registered with ID ${result.insertId}`);
        try {
            let emailformat = `
                <div style="background: url('https://i.postimg.cc/3Jqwpvdk/Untitled.jpg'); 
                background-size: cover; 
                background-position: center; 
                color: white; 
                padding: 50px; 
                text-align: center; 
                font-size: 18px; 
                font-family: Arial, sans-serif; 
                height: 500px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;">
       <pre> 
                Dear ${name},
                Congratulations! 🎉 You are now an official Campus Ambassador for Vividhotsava 2025 🚀

                Your referral code is ${caId}

                We are thrilled to have you as part of our ambassador community, where you will play a crucial role in spreading the excitement of Vividhotsava 2025 across your campus. As an ambassador, you will:

                ✅ Promote Vividhotsava and encourage participation.
                ✅ Network with like-minded leaders from across the country.
                ✅ Gain exclusive perks, certificates, and recognition.
                ✅ Be a part of India's most vibrant youth fest!

                📅 Event Dates: 14-17 April  
                📍 Venue: Chhatrapati Shahu Ji Maharaj University, Kanpur  

                Stay tuned for exciting updates, challenges, and rewards!

                Once again, welcome aboard! Let’s make Vividhotsava 2025 an unforgettable experience together. 🌟

                Best Regards,  
                Abhishek  
                Team Vividhotsava
                <pre/>
    </div>`;
    await sendemail(email,`Welcome to Vividhotsava 2025 – Your Campus Ambassador Journey Begins! 🎉`,emailformat)
        } catch (error) {
            console.log(error);
            
        }

       
        res.status(200).json({ message: "Success" });

        connection.release();
    } catch (error) {
        console.error("Error while registering Contingent ambassador:", error);
        res.status(500).json({ error: "Failed to add the data to the database" });
    }
});

app.post('/api/payment',async(req,res) => {
    let acc=req.body.acc;
    let amount= 1100;
    let orderId=req.body.order_Id;
    if(acc){
        amount+=1500
    }
    const redirectUrl = generateSBIpaymentUrl(orderId, amount);
    res.json({ redirectUrl});
    
});
app.post('/api/payment-callback',(req,res)=>{
    const payment_details=req.body;
    
    res.json() 

})

app.post("/api/checkrefral",(req,res)=>{
    let referal_Code=req.body;
    console.log(referalCode_exists(referal_Code));
    
    if(referalCode_exists(referal_Code)) {
        res.status(200).json({exsits:true})
    }else{
        res.status(401).json({exists:false})
    }
})
app.post("/api/registeruser",upload.single('collegeId'),async (req, res) => {
        try {
            const data = req.body;
            const name = data.name;
            const email = data.email;
            const college = data.college;
            const acc = data.accomodation ? 1 : 0;
            const order_Id = `ORDER_${Date.now()}`;
            const referal_code = data.referal;
            const college_id = req.file;  
            const paymentDetails = null;

            if (!college_id) {
                return res.status(400).json({
                    error: "Both college ID front and back images are required",
                });
            }
            

            const vv_id = await createvvid();
            const connection = await connectDB();

            

            const sql ="INSERT INTO participants (vv_id, name, email, college, accommodation, order_Id, college_id,payment_details,referal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            const [result] = await connection.query(sql, [vv_id,name,email,college,acc,order_Id,college_id.buffer, paymentDetails, referal_code]);

            console.log(result);
            console.log(`Participant successfully registered with ID ${result.insertId}`);
            res.status(200).json({
                order: order_Id,
                vvid: vv_id,
                acc:acc
            });

            connection.release();
        } catch (error) {
            console.error("Error while registering user:", error);
            res
                .status(500)
                .json({ error: "Failed to add the data to the database" });
        }
    }
);


app.post('/api/registersoloevent', async (req, res) => {
   const data = req.body;
    console.log(data);
    let vv_id = data.vvid;
    let eventNames = ["","",""];
    for(let i =0;i<data.events.length;i++){
        eventNames[i] = (data.events[i]).toString();
    }
    try{
        const connection =  await connectDB();
        const sql = "INSERT INTO soloEvents_data (vv_id,event_1,event_2,event_3) VALUES (?,?,?,?)";
        const [result] = await connection.query(sql, [vv_id,eventNames[0],eventNames[1],eventNames[2]]);
        console.log(result);
        console.log(`Participant -:${vv_id} Successfully registered in database for event 1)${event1} 2)${event2} 3)${event3},with id ${result.insertId}`);
        connection.release();
    } catch (error) {
        res.status(500).json({ error: "Failed to add the data to the database" });
    }
});

app.post('/api/registerteamevent', async (req, res) => {
    
    const data = req.body;
    console.log(data);
    let vv_id = (data.vvid).toString();
    let event = (data.event).toString();
    let membersVVID = ["","","","","","","","","","","",""];
    membersVVID[0]=vv_id.toString();
    for(let i =0;i<data.members.length;i++){
    membersVVID[i+1] = (data.members[i]).toString();
    }
    try{
        const connection =  await connectDB();
        
        const sql = "INSERT INTO teamEvents_data (vv_id,event,leader,member_2,member_3,member_4,member_5,member_6,member_7,member_8,member_9,member_10,member_11,member_12) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        console.log(membersVVID);
        const [result] =  await connection.query(sql, [vv_id,event,membersVVID[0],membersVVID[1],membersVVID[2],membersVVID[3],membersVVID[4],membersVVID[5],membersVVID[6],membersVVID[7],membersVVID[8],membersVVID[9],membersVVID[10],membersVVID[11],membersVVID[12]]);
        console.log(result);
        console.log(`Team Successfully Registered for event ${event}, with participants 1)${membersVVID[0]},2)${membersVVID[1]},3)${membersVVID[2]},4)${membersVVID[3]},5)${membersVVID[4]},6)${membersVVID[5]},7)${membersVVID[6]}8)${membersVVID[7]},9)${membersVVID[8]},10)${membersVVID[9]},11)${membersVVID[10]},12)${membersVVID[11]}, and SQL_ID :${result}`);
        connection.release();
        res.status(200).json({ messege: "Team Successfully Registered for event"});
        
    } catch (error) {
        res.status(500).json({ error: "Failed to add the data to the database" });
    }
 });


 app.post('/api/checkrefral',(req,res)=>{
   let referal_Code= req.body;
   if (!referalCode_exists(referal_Code)) {
        res.status(401);
   }
 })


app.get('/brochure',(req,res)=>{
    const filepath=path.join(__dirname,'files','brochure.pdf')
    res.sendFile(filepath)
})

app.get('/rulebook',(req,res)=>{
    const filepath=path.join(__dirname,'files','rulebook.pdf')
    res.sendFile(filepath)
})

app.get('/yp',(req,res)=>{
    const filepath=path.join(__dirname,'files','ypbackground.pdf')
    res.sendFile(filepath)
})
app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});


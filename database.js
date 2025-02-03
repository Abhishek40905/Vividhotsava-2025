import mysql from "mysql2/promise"; 

const pool = mysql.createPool({
    host:"srv1873.hstgr.io",
    user: "u541412471_root", 
    password: "qwertyY1234#",
    database: "u541412471_fest",
    port:3306
});

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`MySQL database connected with connection ID: ${connection.threadId}`);
        return connection;
    } catch (error) {
        console.error("MySQL connection failed due to:", error);
        throw error; 
    }
};

async function checkForMaxEvents(vv_id){
    let eventsCount=0;
    //events from solo events data
    console.log("Checking Solo events");
    const rows_solo = await pool.query('SELECT * FROM soloevents_data WHERE vv_id = ?', [vv_id]);
    for(let i=0;i<rows_solo[0].length;i++){
        if((rows_solo[0][i].event_1)!=null){if((rows_solo[0][i].event_1).toString().length>1){eventsCount+=1;console.log(rows_solo[0][i]);}}
        if((rows_solo[0][i].event_2)!=null){if((rows_solo[0][i].event_2).toString().length>1){eventsCount+=1;console.log(rows_solo[0][i]);}}
        if((rows_solo[0][i].event_3)!=null){if((rows_solo[0][i].event_3).toString().length>1){eventsCount+=1;console.log(rows_solo[0][i]);}}
    }
    //events from team events data 
    console.log("Checking Team events");
    const rows_team = await pool.query('SELECT * FROM teamevents_data WHERE vv_id = ?', [vv_id]);
    console.log(rows_team[0]);
    eventsCount+=rows_team[0].length;
    //what if the leader is the team member of any other team 
    console.log("checking for edge cases");
    const rows = await pool.query('SELECT * FROM teamevents_data');
    for(let i=0;i<rows[0].length;i++){
        //checking for vv_id in team members vv_id's
        let vv_idInmembersCount=0;
        if(rows[0][i].member_2==vv_id){vv_idInmembersCount+=1;}
        if(rows[0][i].member_3==vv_id){vv_idInmembersCount+=1;}
        if(rows[0][i].member_4==vv_id){vv_idInmembersCount+=1;}
        if(rows[0][i].member_5==vv_id){vv_idInmembersCount+=1;}
        if(rows[0][i].member_6==vv_id){vv_idInmembersCount+=1;}
        if(rows[0][i].member_7==vv_id){vv_idInmembersCount+=1;}
        if(vv_idInmembersCount>=1){if(rows[0][i].leader!=vv_id){eventsCount+=1;console.log(rows[0][i]);}}// if leader is part of same team ,problem solved
    }

    return eventsCount;
}


async function referalCode_exists(referal_Code){
    try{
        const referID = referal_Code.toString().trim();
        const rows = await pool.query('SELECT * FROM ca WHERE caId = ?', [referID]);
        if (rows[0].length>0){
            console.log("ReferalCode esists,",referID);
            return true;
        }
        
    }catch (error) {
        console.error("Error querying the database for referalId:", error);
        throw error; 
    }
    return false;

}

async function hasEmail(email) {
    try {
        const sanitizedEmail = email.trim().toLowerCase(); 
        const rows = await pool.query('SELECT * FROM participants WHERE email = ?', [sanitizedEmail]);
        console.log("latest");
        console.log("Query Result:", rows); 
        let contains = false;
        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < rows[i].length; j++) {
                console.log(rows[i][j]);
                if (rows[i][j].email === sanitizedEmail) {
                    contains = true;
                    return contains;
                }
                
            }
        }
        return contains; 
    } catch (error) {
        console.error("Error querying the database:", error);
        throw error; 
    }
}

const emailExists = async (email) => {
    try {
        console.log("Checking email:", email); 
        const exists = await hasEmail(email);
        return exists; 
    } catch (error) {
        console.error("Error checking email:", error);
        return false; 
    }
};
const createvvid= async () => {
    //code to add vvid to the db using email
    let row_s = await pool.query('SELECT * FROM participants');
    console.log(row_s);
    const vv_index = (row_s[0].length)+1;
    let vv_id = 'VV_'+vv_index.toString();
    console.log(`vvid is created : ${vv_id}`);
    //checking if vv_id is duplicated
    let isDuplicate = false;
    for(let i =0 ;i< row_s[0].length;i++){
        if (row_s[0][i].vv_id == vv_id)isDuplicate =true;
    }
    if (isDuplicate){
        console.log(isDuplicate);
        return await createvvid();
    }
    console.log("Returning vv_id");
    return vv_id;
};

const createCAId = async()=>{
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let CAId = '';
    for ( let i =0;i<8;i++){
        const randomIndex = Math.floor(Math.random()*characters.length);
        CAId += characters[randomIndex];
    }
    return CAId;
}

const getvvid = async (email) => {
    let row = await pool.query('SELECT * FROM participants WHERE email = ?',[email.trim().toLowerCase()]);
    console.log(row);
    console.log(row[0][0].vv_id);
    return row[0][0].vv_id;
     
};


export { connectDB, emailExists,createvvid,getvvid,createCAId,referalCode_exists,checkForMaxEvents };

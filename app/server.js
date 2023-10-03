var express = require("express")
var path = require('path')
var fs = require("fs")

const {Gateway, Wallets} = require("fabric-network")
const FabricCAServices = require("fabric-ca-client")
const { json } = require("body-parser")
const { Console } = require("console")

var app = express()

app.use(express.urlencoded({extended:false}))
app.use(express.json())
app.use('/views', express.static(path.join(__dirname,'views')))

const ccpPath = path.resolve(__dirname,'config','connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath,"utf-8"))

var product = [
    { 상품명: "몬스테라 알보 1장", 가격: "300,000" , 식물ID: "sim_001", img :"image/sim_001.jpeg" },
    { 상품명: "몬스테라 고스트 1장", 가격: "304,000" , 식물ID: "sim_002", img :"image/sim_002.jpeg" },
    { 상품명: "몬스테라 알보 묘", 가격: "50,900" , 식물ID: "sim_003", img :"image/sim_003.jpeg" },
    { 상품명: "몬스테라 알보 바리에가타", 가격: "800,800" , 식물ID: "sim_004", img :"image/sim_004.jpeg" }
];

app.get("/product", (req,res)=>{
    res.status(200).send(product)
})
app.get('/',(req,res)=>{
    console.log('/ route get request')
    res.status(200).sendFile(__dirname+'/views/index.html')
})

app.get('/admin', (req,res)=>{
    console.log('/admin get responce')
    res.status(200).sendFile(__dirname+'/views/admin.html')
})

app.get('/list', (req,res)=>{
    console.log('/list get responce')
    // searchinput
    //req.body.searchinput
    res.status(200).sendFile(__dirname+'/views/list.html')
})

app.get('/plant/ship', async(req,res)=>{
    const plantid = req.query.plantid;
    const productname = req.query.productname;
    const productprice = req.query.productprice;

    console.log("'/plant/ship'",plantid)

    const walletpath = path.join(process.cwd(),'wallet')
    const wallet = await Wallets.newFileSystemWallet(walletpath)
    const useridenttity = await wallet.get('appuser1')
    try{

    
        if(!useridenttity){
            console.log("an identity for the user does not exist in the wallet")
            console.log("run the register.js before try")
            response.status(401).snedFile(__dirname+'/views/list.html')
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: 'appuser1', discovery: {enabled:true, asLocalhost:true}})
        const network = await gateway.getNetwork("mychannel")
        const contract = network.getContract('asset')
        const txresult = await contract.evaluateTransaction("ReadAsset",plantid)
        gateway.disconnect()
        result = JSON.parse(txresult)
        var productHTML =  `
            <div class="container text-center">
                <table>
                    <tr>
                        <td><strong>소유자:</strong></td>
                        <td>${result.Owner}</td>
                    </tr>
                    <tr>
                        <td><strong>식물ID:</strong></td>
                        <td id=>${result.PlantID}</td>
                    </tr>
                    <tr>
                        <td><strong>상품명:</strong></td>
                        <td>${productname}</td>
                    </tr>
                    <tr>
                        <td><strong>상품가격:</strong></td>
                        <td>${productprice}</td>
                    </tr>
                </table>
            </div>
    
            `;  
        const resultpath = path.join(process.cwd(),'views/ship.html')
        var resultHTML = fs.readFileSync(resultpath,'utf-8');
        resultHTML = resultHTML.replace(`<div id="here"></div>`,productHTML)
        res.status(200).send(resultHTML)
    }
    catch(error){
        console.log(error)
    }
})

app.post('/admin', async (req,res)=>{
    console.log('/admin post request')
    const adminid = req.body.adminid
    const adminpw = req.body.adminpw
    console.log("/admin post call", adminid, adminpw)

    try{
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, {trustedRoots: caTLSCACerts, verify:false}, caInfo.caName);

        const walletPath = path.join(process.cwd(),'wallet');
        const wallet= await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const identify = await wallet.get(adminid)

        if(identify){
            console.log('An identify for the admin user admin already exists in the wallet')
            const result_obj = JSON.parse('{"result":"failed","message":"An identify for the admin user admin already exists in the wallet"}');
            
            var result_object = {}
            result_object.result = 'failed'
            result_object.message = "An identify for the admin user admin already exists in the wallet"
            res.status(200).send(result_object)
            return
        }

        const enrollment = await ca.enroll({enrollmentID: adminid, enrollmentSecret: adminpw})
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put(adminid, x509Identity)

        //----결과 전송
        var result_object = {}
        result_object.result = 'success'
        result_object.message = "admin wallet is created"
        res.status(200).send(result_object)
        // 지갑연동 3.4 클라이언트에 결과 전송 
    }
    catch(error) {
        console.log(error)
         // 지갑연동 3.4 클라이언트에 실패 결과 전송 
         console.log("fail to create admin identify")
         var result_object = {}
         result_object.result = 'failed'
         result_object.message = "Failed to create admin identify"
         res.status(200).send(result_object)
    }
})

app.post('/user', async(req,res)=>{
    console.log("/user post request")

    const userid = req.body.userid
    const userrole = req.body.userrole
    const userdpt = req.body.userdpt

    console.log("user post call", userid,userrole,userdpt)

    try{
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        //4.2 wallet 객체 생성 및 id 중복
        const walletPath = path.join(process.cwd(), 'wallet')
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const userIdentity = await wallet.get(userid)
        if(userIdentity){
            console.log('An identity for user'+userid+'already exists')
            var result_object = {}
            result_object.result="failed"
            result_object.message="already exists"
            res.send(result_object)
            return
        }

        const adminIdentity = await wallet.get('admin')
        if(!adminIdentity){
            console.log('an identity for admin does not exist')
            var result_object = {}
            result_object.result = 'failed'
            result_object.message = 'An identity for admin does not exist'
            res.send(result_object)
            return
        }

        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity,'admin');

        const secret = await ca.register({
            affiliation: userdpt,
            enrollmentID: userid,
            role:userrole
        },adminUser)
        //4.5 유저 인증서 엔롤
        const enrollment = await ca.enroll({
            enrollmentID: userid,
            enrollmentSecret: secret
        },adminUser)

        //4.6 유저 인증서 x.509 객체 생성
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put(userid,x509Identity)
        
        var result_object = {}
        result_object.result = 'success'
        result_object.message = "user wallet is created"
        res.status(200).send(result_object)

    }
    catch(error) {
        console.log(error)
        console.log("user wallet is not created:", userid)
        var result_object = {}
        result_object.result = 'faild'
        result_object.message = "user wallet is not created"
        res.status(200).send(result_object)
    }
})

app.post("/plant/log", async(req,res)=>{

    const owner     = req.body.owner
    const plantid   = req.body.plantid
    const sunlight  = req.body.sunlight
    const moisture  =  req.body.moisture
    const humidity  =  req.body.humidity
    const ph        = req.body.ph
    const ca       =  req.body.ca
    const hoticulture = req.body.hoticulture

    console.log("/plant/log post reqeust",owner,plantid,sunlight,moisture,humidity,ph,ca,hoticulture)

    try{
        const walletPath = path.join(process.cwd(), 'wallet')
        console.log(walletPath)
        const wallet = await Wallets.newFileSystemWallet(walletPath)

        const useridenttity = await wallet.get("appuser1")
        if(!useridenttity){
            console.log("an identity for the user "+ca+" does not exist")
            var result_object= {}
            return_object.result = "failed"
            return_object.message = "an identity for the user "+ca+" does not exist"
            res.send(result_object)
            return  
        } 

        console.log("1")
        const gateway = new Gateway();
        console.log("1.1")
        //await gateway.connect(ccp, {wallet, identity: cert, discovery: {enabled: true, asLocalhost:true}})
        await gateway.connect(ccp, {wallet, identity: "appuser1", discovery: {enabled:true, asLocalhost:true}})
        console.log("1.2")
        const network = await gateway.getNetwork("mychannel")   
        console.log("2")
        const contract = network.getContract('asset')
        console.log("3")
        await contract.submitTransaction("UpdateAsset",owner, plantid, sunlight, moisture, humidity, ph, hoticulture)
        console.log("4")
        var result_obj = {}
        result_obj.result = "success"
        result_obj.message= "asset is updated: "+plantid
        res.status(200).send(result_obj)
        
        gateway.disconnect()

    }
    catch(error){
        console.log(error)

        var result_obj= {}
        result_obj.result = "failed"
        result_obj.message = "failed to update asset "+plantid
        res.status(200).send(result_obj)
    }
})

app.post("/plant/plant", async(req,res)=>{

    const owner     = req.body.owner
    const plantid   = req.body.plantid
    const sunlight  = req.body.sunlight
    const moisture  =  req.body.moisture
    const humidity  =  req.body.humidity
    const ph        = req.body.ph
    const ca       =  req.body.ca
    const hoticulture = req.body.hoticulture

    console.log("/plant/plant post reqeust",owner,plantid,sunlight,moisture,humidity,ph,ca,hoticulture)

    try{
        const walletPath = path.join(process.cwd(), 'wallet')
        console.log(walletPath)
        const wallet = await Wallets.newFileSystemWallet(walletPath)

        const useridenttity = await wallet.get("appuser1")
        if(!useridenttity){
            console.log("an identity for the user "+ca+" does not exist")
            var return_object= {}
            return_object.result = "failed"
            return_object.message = "an identity for the user "+ca+" does not exist"
            res.send(return_object)
            return  
        } 

        console.log("1")
        const gateway = new Gateway();
        console.log("1.1")
        //await gateway.connect(ccp, {wallet, identity: cert, discovery: {enabled: true, asLocalhost:true}})
        await gateway.connect(ccp, {wallet, identity: "appuser1", discovery: {enabled:true, asLocalhost:true}})
        console.log("1.2")
        const network = await gateway.getNetwork("mychannel")   
        console.log("2")
        const contract = network.getContract('asset')
        console.log("3")
        await contract.submitTransaction("CreateAsset",owner, plantid, sunlight, moisture, humidity, ph, hoticulture)
        console.log("4")
        var result_obj = {}
        result_obj.result = "success"
        result_obj.message= "asset is created: "+plantid
        res.status(200).send(result_obj)
        
        gateway.disconnect()

    }
    catch(error){
        console.log(error)

        var result_obj= {}
        result_obj.result = "failed"
        result_obj.message = "failed to create asset "+plantid
        res.status(200).send(result_obj)
    }
})
app.get("/plant/log",async(req,res)=>{
    plantid = req.query.plantid;
    console.log("/plant/log/ call",plantid)
    ccert = "appuser1"

    try {
        const walletPath = path.join(process.cwd(), 'wallet')
        const wallet = await Wallets.newFileSystemWallet(walletPath)
        const useridenttity = await wallet.get(ccert)

        if(!useridenttity){
            console.log("an identity for the user "+ ccert+" does not exist")
            var return_object= {}
            return_object.result = "failed"
            return_object.message = "an identity for the user "+ ccert+" does not exist"
            res.send(return_object)
            return 
        }  

        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: ccert, discovery: {enabled:true, asLocalhost:true}})

        const network = await gateway.getNetwork("mychannel")
        const contract = network.getContract('asset')
        const txresult =await contract.evaluateTransaction("GetAssetHistory",plantid)

        gateway.disconnect()

        result = JSON.parse(txresult)
       
        var productHTML = ''
        for(key in result){

            productHTML += productHTML =  `
            <div class="container text-center">
                <table margin:10px>
                    <tr>
                      
                    </tr>

                    <tr>
                        <td><strong>트랜잭션 아이디</strong></td>
                        <td>${result[key].txId}</td>
                    </tr>

                    <tr>
                        <td><strong>시간</strong></td>
                        <td>${result[key].timestamp}</td>
                    </tr>
                    
                    <tr>
                        <td><strong>기록:</strong></td>
                        <td>record</td>
                    </tr>
                    <tr>
                        <td><strong>Owner</strong></td>
                        <td>${result[key].record["Owner"]}</td>
                    </tr>
                    <tr>
                        <td><strong>PlantID</strong></td>
                        <td>${result[key].record["PlantID"]}</td>
                    </tr>
                    <tr>
                        <td><strong>Sunlight</strong></td>
                        <td>${result[key].record["Sunlight"]}</td>
                    </tr>
                    <tr>
                        <td><strong>Moisture</strong></td>
                        <td>${result[key].record["Moisture"]}</td>
                    </tr>
                    <tr>
                        <td><strong>Humidity</strong></td>
                        <td>${result[key].record["Humidity"]}</td>
                    </tr>
                    <tr>
                        <td><strong>Ph</strong></td>
                        <td>${result[key].record["Ph"]}</td>
                    </tr>
                    <tr>
                        <td><strong>Horticulture</strong></td>
                        <td>${result[key].record["Horticulture"]}</td>
                    </tr>
                    <hr>
                </table>
                
            </div>
    
            `;

        }  
        const resultpath = path.join(process.cwd(),'views/records.html')
        var resultHTML = fs.readFileSync(resultpath,'utf-8');
        resultHTML = resultHTML.replace(`<div></div>`,productHTML)
        res.status(200).send(resultHTML)

    }
    catch (error){
        console.log(error)

    }

})

app.put("/changeowner",async(req,res)=>{

    ccert =  "appuser1";
    plantid = req.body.plantid;
    buyer = req.body.buyer;
    console.log("changeowner put",plantid,buyer)

    try{
        
        const walletPath = path.join(process.cwd(), 'wallet')
        const wallet = await Wallets.newFileSystemWallet(walletPath)
        const useridenttity = await wallet.get(ccert)

        if(!useridenttity){
            console.log("an identity for the user "+ certt+" does not exist")
            var return_object= {}
            return_object.result = "failed"
            return_object.message = "an identity for the user "+certt+" does not exist"
            res.send(result_object)
            return 
        } 

        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: ccert, discovery: {enabled:true, asLocalhost:true}})
        const network = await gateway.getNetwork("mychannel")
        const contract = network.getContract('asset')
        const txresult =await contract.submitTransaction("TransferAsset",plantid, buyer)

        var result_obj = {}
        result_obj.result = "success"
        result_obj.message= "asset is transfered: "+ plantid + " " + buyer
        res.status(200).send(result_obj)
        gateway.disconnect()

    }
    catch (error){
        console.log(error)

        var result_object = {}
        result_object.result = "failed"
        result_object.message = "Failed to transfer asset: "+plantid

        res.status(200).send(result_object)
    }
})

app.listen(3000, ()=>{
    console.log('express server started: 3000');
    
})

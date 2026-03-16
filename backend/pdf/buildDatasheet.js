const path = require("path");

const buildDatasheetHTML = (product) => {

const logo = "file://" + path.join(__dirname,"../assets/logo.jpg");
const bg = "file://" + path.join(__dirname,"../assets/bg.png");
const makeIndia = "file://" + path.join(__dirname,"../assets/MakeInIndia.png");

return `

<html>

<head>

<style>

body{
margin:0;
font-family:Arial;
}

.page{
position:relative;
width:794px;
height:1123px;
overflow:hidden;
}

.bg{
position:absolute;
bottom:0;
width:100%;
}

.logo{
position:absolute;
top:40px;
left:40px;
width:220px;
}

.model{
position:absolute;
top:180px;
left:100px;
font-size:28px;
font-weight:bold;
}

.product{
position:absolute;
top:340px;
left:50%;
transform:translateX(-50%);
width:360px;
}

.desc{
position:absolute;
top:680px;
left:50%;
transform:translateX(-50%);
font-size:18px;
font-weight:600;
text-align:center;
width:620px;
}

.india{
position:absolute;
bottom:120px;
right:80px;
width:150px;
}

.footer{
position:absolute;
bottom:20px;
left:40px;
font-size:12px;
color:#444;
}

</style>

</head>

<body>

<div class="page">

<img class="bg" src="${bg}">

<img class="logo" src="${logo}">

<div class="model">
Model: ${product.model || product.name}
</div>

<img class="product" src="${product.image}">

<div class="desc">
${product.description}
</div>

<img class="india" src="${makeIndia}">

<div class="footer">
© 2024 AADONA Communication Pvt Ltd. All rights reserved
</div>

</div>

</body>

</html>

`;
};

module.exports = buildDatasheetHTML;
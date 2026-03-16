const fs = require("fs");
const path = require("path");

const buildDatasheetHTML = (product) => {

const logo = fs.readFileSync(
path.resolve(__dirname,"../assets/logo.jpg")
).toString("base64");

const bg = fs.readFileSync(
path.resolve(__dirname,"../assets/bg.png")
).toString("base64");

const makeIndia = fs.readFileSync(
path.resolve(__dirname,"../assets/MakeInIndia.png")
).toString("base64");


/* FEATURES */

const highlightsHTML = (product.highlights || [])
.map(h => `<li>${h}</li>`)
.join("");



/* SPECIFICATIONS */

const specsHTML = Object.entries(product.specifications || {})
.map(([section, specs]) => {

const rows = Object.entries(specs || {})
.map(([key,value])=>`
<tr>
<td>${key}</td>
<td>${value}</td>
</tr>
`).join("");

return `

<div class="spec-section">

<h2>${section}</h2>

<table>

${rows}

</table>

</div>

`;

}).join("");



return `

<!DOCTYPE html>

<html>

<head>

<meta charset="utf-8"/>

<style>

body{
margin:0;
font-family:Arial, Helvetica, sans-serif;
color:#222;
}

/* PAGE 1 */

.page{
position:relative;
width:794px;
height:1123px;
overflow:hidden;
}

/* BACKGROUND */

.bg{
position:absolute;
bottom:0;
left:0;
width:100%;
height:450px;
object-fit:cover;
opacity:0.9;
}

/* LOGO */

.logo{
position:absolute;
top:50px;
left:60px;
width:240px;
}

/* MODEL */

.model{
position:absolute;
top:220px;
left:120px;
font-size:34px;
font-weight:700;
}

/* PRODUCT IMAGE */

.product{
position:absolute;
top:420px;
left:50%;
transform:translateX(-50%);
width:420px;
filter: drop-shadow(0px 20px 30px rgba(0,0,0,0.25));
}

/* DESCRIPTION */

.desc{
position:absolute;
top:740px;
left:50%;
transform:translateX(-50%);
font-size:22px;
font-weight:600;
text-align:center;
width:650px;
}

/* MAKE INDIA */

.india{
position:absolute;
bottom:180px;
right:120px;
width:180px;
}

/* FOOTER */

.footer{
position:absolute;
bottom:30px;
left:60px;
font-size:12px;
color:#333;
}

/* PAGE BREAK */

.page-break{
page-break-before:always;
}


/* PAGE 2+ */

.page2{
padding:80px;
}

/* TITLES */

.page2 h1{
font-size:28px;
margin-bottom:20px;
border-bottom:3px solid #1b7f4c;
padding-bottom:8px;
}

/* OVERVIEW */

.page2 p{
font-size:16px;
line-height:1.7;
margin-bottom:40px;
}

/* FEATURES */

.page2 ul{
padding-left:20px;
margin-bottom:40px;
}

.page2 li{
margin-bottom:10px;
font-size:16px;
}

/* SPEC SECTIONS */

.spec-section{
margin-bottom:40px;
}

.spec-section h2{
font-size:20px;
margin-bottom:10px;
color:#1b7f4c;
}

/* TABLE */

table{
width:100%;
border-collapse:collapse;
}

td{
border:1px solid #ddd;
padding:10px;
font-size:14px;
}

tr:nth-child(even){
background:#f5f5f5;
}

</style>

</head>


<body>


<!-- PAGE 1 COVER -->

<div class="page">

<img class="bg" src="data:image/png;base64,${bg}"/>

<img class="logo" src="data:image/jpeg;base64,${logo}"/>

<div class="model">
Model: ${product.model || product.name}
</div>

<img class="product" src="${product.image}" />

<div class="desc">
${product.description || ""}
</div>

<img class="india" src="data:image/png;base64,${makeIndia}" />

<div class="footer">
© 2024 AADONA Communication Pvt Ltd. All rights reserved
</div>

</div>


<!-- PAGE BREAK -->

<div class="page-break"></div>



<!-- PAGE 2+ -->

<div class="page2">

<h1>Product Overview</h1>

<p>
${product.overview?.content || ""}
</p>


<h1>Key Features</h1>

<ul>

${highlightsHTML}

</ul>


<h1>Technical Specifications</h1>

${specsHTML}

</div>


</body>

</html>

`;

};

module.exports = buildDatasheetHTML;
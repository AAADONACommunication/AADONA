const express = require("express");
const router = express.Router();
const transporter = require("../mailer");
const { formLimiter } = require("../middleware/rateLimiters");
const { upload } = require("../middleware/uploads");
const Inquiry = require("../models/Inquiry");
const Product = require("../models/Product");
const isEmailDomainValid = require("../utils/email");
const { uploadToFirebase } = require("../utils/storageAliases");

router.post("/submit-partner", formLimiter, async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Partner Application",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Partner Application - ${form.companyName || "Unknown"}`,
      html: `
      <h2 style="color:#166534">New Partner Application</h2>

      <table border="1" cellpadding="8" cellspacing="0" 
      style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">

      <tr><td><b>First Name</b></td><td>${form.firstName || "-"}</td></tr>
      <tr style="background:#f0fdf4"><td><b>Last Name</b></td><td>${form.lastName || "-"}</td></tr>
      <tr><td><b>Email</b></td><td>${form.email || "-"}</td></tr>
      <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>

      <tr><td><b>Primary Interest</b></td><td>${form.primaryInterest || "-"}</td></tr>

      <tr style="background:#f0fdf4"><td><b>Company Name</b></td><td>${form.companyName || "-"}</td></tr>
      <tr><td><b>Company Address</b></td><td>${form.companyAddress || "-"}</td></tr>
      <tr style="background:#f0fdf4"><td><b>Company City</b></td><td>${form.companyCity || "-"}</td></tr>
      <tr><td><b>State / Region</b></td><td>${form.regionStateProvince || "-"}</td></tr>
      <tr style="background:#f0fdf4"><td><b>Postal Code</b></td><td>${form.postalZip || "-"}</td></tr>
      <tr><td><b>Country</b></td><td>${form.country || "-"}</td></tr>

      <tr style="background:#f0fdf4"><td><b>Geographies Served</b></td><td>${form.geographiesServed || "-"}</td></tr>
      <tr><td><b>Website</b></td><td>${form.websiteAddress || "-"}</td></tr>

      <tr style="background:#f0fdf4"><td><b>Annual Revenue</b></td><td>${form.revenueAnnual || "-"}</td></tr>
      <tr><td><b>Verticals</b></td><td>${form.verticals || "-"}</td></tr>

      <tr style="background:#f0fdf4"><td><b>Revenue - Private Projects</b></td><td>${form.revenuePrivateProjects || "-"}</td></tr>
      <tr><td><b>Revenue - Government</b></td><td>${form.revenueFromGovt || "-"}</td></tr>
      <tr style="background:#f0fdf4"><td><b>Revenue - Direct End Customer</b></td><td>${form.revenueFromDirectEnd || "-"}</td></tr>

      <tr><td><b>Sales Team Strength</b></td><td>${form.strengthSalesTeam || "-"}</td></tr>
      <tr style="background:#f0fdf4"><td><b>Technical Sales Team</b></td><td>${form.strengthTechnicalSalesTeam || "-"}</td></tr>

      <tr><td><b>Revenue - Retail / Trading</b></td><td>${form.revenueRetailTrading || "-"}</td></tr>

      <tr style="background:#f0fdf4"><td><b>Market Segment Expertise</b></td><td>${form.marketSegmentExpertise || "-"}</td></tr>
      <tr><td><b>WLAN / LAN Expertise</b></td><td>${form.wlanLanExpertise || "-"}</td></tr>

      <tr style="background:#f0fdf4"><td><b>Brands You Sell</b></td><td>${form.brandsYouSell || "-"}</td></tr>

      <tr><td><b>Other Comments</b></td><td>${form.otherComments || "-"}</td></tr>
      <tr style="background:#f0fdf4"><td><b>Additional Notes</b></td><td>${form.additionalNotes || "-"}</td></tr>

      </table>
      `,
    });

    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-project-locking", formLimiter, async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Project Locking",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Project Locking Request - ${form.projectName || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New Project Locking Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Company</b></td><td>${form.company || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Address</b></td><td>${form.streetAddress || "-"}, ${form.streetAddress2 || ""}, ${form.city || ""}, ${form.regionState || ""}, ${form.postalZip || ""}</td></tr>
          <tr><td><b>Country</b></td><td>${form.country || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Model</b></td><td>${form.modelName || "-"}</td></tr>
          <tr><td><b>Quantity</b></td><td>${form.quantity || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>AADONA Sales</b></td><td>${form.aadonaSales || "-"}</td></tr>
          <tr><td><b>Project Name</b></td><td>${form.projectName || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Project / Tender Name</b></td><td>${form.projectTenderName || "-"}</td></tr>
          <tr><td><b>End Customer Name</b></td><td>${form.endCustomerName || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>End Customer Contact</b></td><td>${form.endCustomerContact || "-"}</td></tr>
          <tr><td><b>Expected Closure</b></td><td>${form.expectedClosure || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>SI Partner Involved</b></td><td>${form.siPartner ? "Yes" : "No"}</td></tr>
        </table>
      `,
    });

    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-demo", formLimiter, async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Demo Request",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Demo Request - ${form.firstName} ${form.lastName}`,
      html: `
        <h2 style="color:#166534">New Demo Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Address</b></td><td>${form.streetAddress || "-"}, ${form.streetAddress2 || ""}, ${form.city || ""}, ${form.regionStateProvince || ""}, ${form.postalZipCode || ""}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Country</b></td><td>${form.country || "-"}</td></tr>
          <tr><td><b>Model Name</b></td><td>${form.modelName || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Customer Type</b></td><td>${(form.customerType || []).join(", ") || "-"}</td></tr>
          <tr><td><b>Comments</b></td><td>${form.comment || "-"}</td></tr>
        </table>
      `,
    });

    res.json({ success: true, message: "Demo request submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-training", formLimiter, async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Training Request",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Training Request - ${form.firstName} ${form.lastName}`,
      html: `
        <h2 style="color:#166534">New Training Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Company</b></td><td>${form.company || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Number of Participants</b></td><td>${form.numberOfParticipants || "-"}</td></tr>
          <tr><td><b>Training Location</b></td><td>${form.streetAddress || "-"}, ${form.streetAddress2 || ""}, ${form.city || ""}, ${form.regionStateProvince || ""}, ${form.postalZipCode || ""}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Country</b></td><td>${form.country || "-"}</td></tr>
          <tr><td><b>Customer Type</b></td><td>${(form.customerType || []).join(", ") || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Comments</b></td><td>${form.comment || "-"}</td></tr>
        </table>
      `,
    });

    res.json({ success: true, message: "Training request submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-warranty", formLimiter, upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "warranty");
    await Inquiry.create({
      formType: "Warranty Check",
      customerName: form.email,
      customerEmail: form.email,
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"Warranty Request" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Warranty Check - Serial: ${form.serialNumber || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New Warranty Check Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>City</b></td><td>${form.city || "-"}</td></tr>
          <tr><td><b>ZIP / PIN Code</b></td><td>${form.zipCode || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Serial Number</b></td><td>${form.serialNumber || "-"}</td></tr>
          <tr><td><b>Purchase Date</b></td><td>${form.purchaseDate || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Place of Purchase</b></td><td>${form.placeOfPurchase || "-"}</td></tr>
          ${attachmentUrl ? `<tr><td><b>Invoice File</b></td><td><a href="${attachmentUrl}">View Uploaded Invoice</a></td></tr>` : ""}
        </table>
      `,
    };
    if (req.file)
      mailOptions.attachments = [
        { filename: req.file.originalname, content: req.file.buffer },
      ];

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Warranty check submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-techsquad", formLimiter, async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Tech Squad",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: { ...form },
    });

    const mailOptions = {
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Tech Squad Request - ${form.firstName} ${form.lastName}`,
      html: `
        <h2 style="color:#166534">New Tech Squad Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Address</b></td><td>${form.address || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>City</b></td><td>${form.city || "-"}</td></tr>
          <tr><td><b>ZIP / PIN Code</b></td><td>${form.zipCode || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Purchase Date</b></td><td>${form.purchaseDate || "-"}</td></tr>
          <tr><td><b>Service Type</b></td><td>${form.serviceType || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Issue Description</b></td><td>${form.issue || "-"}</td></tr>
        </table>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Tech Squad request submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-doa", formLimiter, upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "doa");
    await Inquiry.create({
      formType: "DOA Request",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New DOA Request - Serial: ${form.serialNumber || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New DOA Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>Address</b></td><td>${form.address || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>City</b></td><td>${form.city || "-"}</td></tr>
          <tr><td><b>ZIP / PIN Code</b></td><td>${form.zipCode || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Product Type</b></td><td>${form.productType || "-"}</td></tr>
          <tr><td><b>Purchase Date</b></td><td>${form.purchaseDate || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Warranty Period</b></td><td>${form.warrantyYear || "-"}</td></tr>
          <tr><td><b>Serial Number</b></td><td>${form.serialNumber || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Invoice Number</b></td><td>${form.invoiceNumber || "-"}</td></tr>
          <tr><td><b>DOA Auth Code</b></td><td>${form.doaAuthCode || "-"}</td></tr>
          <tr><td><b>Issue Description</b></td><td>${form.issue || "-"}</td></tr>
          ${attachmentUrl ? `<tr style="background:#f0fdf4"><td><b>Invoice File</b></td><td><a href="${attachmentUrl}">View Uploaded Invoice</a></td></tr>` : ""}
        </table>
      `,
    };
    if (req.file)
      mailOptions.attachments = [
        { filename: req.file.originalname, content: req.file.buffer },
      ];

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "DOA request submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-product-support", formLimiter, async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Product Support",
      customerName: form.name,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.name}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Product Support Request - ${form.productModel || "Unknown"}`,
      html: `
        <h2 style="color:#166534">New Product Support Request</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.name || "-"}</td></tr>
          <tr><td><b>Company Name</b></td><td>${form.companyName || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Product Model</b></td><td>${form.productModel || "-"}</td></tr>
          <tr><td><b>Email</b></td><td>${form.email}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
          <tr><td><b>City</b></td><td>${form.city || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>ZIP / PIN Code</b></td><td>${form.zipCode || "-"}</td></tr>
          <tr><td><b>Issue / Question</b></td><td>${form.details || "-"}</td></tr>
        </table>
      `,
    });

    res.json({ success: true, message: "Support request submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-product-registration", formLimiter, upload.single("invoiceFile"), async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
    if (!emailValid) {
      return res.status(400).json({ success: false, message: "Invalid email address. Please enter a real email.",
      });
    }
    try {
      // Parse arrays
      const models = JSON.parse(form.models || "[]");
      const serialNumbers = JSON.parse(form.serialNumbers || "[]");

      // Upload file
      const attachmentUrl = await uploadToFirebase(req.file, "registrations");

      // Save in DB
      await Inquiry.create({
        formType: "Product Registration",
        customerName: `${form.firstName} ${form.lastName}`,
        customerEmail: form.email,
        formData: { ...form, models, serialNumbers, attachmentUrl },
      });

      // Mail template
      const mailOptions = {
        from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
        replyTo: form.email,
        to: process.env.COMPANY_EMAIL,
        subject: `New Product Registration - ${serialNumbers[0] || "No Serial"}`,

        html: `
          <h2 style="color:#166534">New Product Registration</h2>

          <table border="1" cellpadding="8" cellspacing="0" 
          style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">

          <tr style="background:#f0fdf4">
            <td><b>Name</b></td>
            <td>${form.firstName} ${form.lastName}</td>
          </tr>

          <tr>
            <td><b>Email</b></td>
            <td>${form.email}</td>
          </tr>

          <tr style="background:#f0fdf4">
            <td><b>Phone</b></td>
            <td>${form.phone || "-"}</td>
          </tr>

          <tr>
            <td><b>City</b></td>
            <td>${form.companyCity || "-"}</td>
          </tr>

          <tr style="background:#f0fdf4">
            <td><b>State / Region</b></td>
            <td>${form.regionStateProvince || "-"}</td>
          </tr>

          <tr>
            <td><b>Postal Code</b></td>
            <td>${form.postalZipCode || "-"}</td>
          </tr>

          <tr style="background:#f0fdf4">
            <td><b>Country</b></td>
            <td>${form.country || "-"}</td>
          </tr>

          <!-- MULTIPLE MODELS -->
          <tr>
            <td><b>Models</b></td>
            <td>
              ${
                models.length
                  ? models.map((m, i) => `${i + 1}. ${m}`).join("<br>")
                  : "-"
              }
            </td>
          </tr>

          <!-- MULTIPLE SERIAL NUMBERS -->
          <tr style="background:#f0fdf4">
            <td><b>Serial Numbers</b></td>
            <td>
              ${
                serialNumbers.length
                  ? serialNumbers.map((s, i) => `${i + 1}. ${s}`).join("<br>")
                  : "-"
              }
            </td>
          </tr>

          <tr>
            <td><b>Invoice Number</b></td>
            <td>${form.invoiceNumber || "-"}</td>
          </tr>

          <tr style="background:#f0fdf4">
            <td><b>Purchased From</b></td>
            <td>${form.purchasedFrom || "-"}</td>
          </tr>

          <tr>
            <td><b>Purchase Date</b></td>
            <td>${form.purchaseDate || "-"}</td>
          </tr>

          <!-- FILE LINK -->
          <tr style="background:#f0fdf4">
            <td><b>Invoice File (Firebase)</b></td>
            <td>
              ${
                attachmentUrl
                  ? `<a href="${attachmentUrl}" target="_blank">View File</a>`
                  : "Not uploaded"
              }
            </td>
          </tr>

          </table>
        `,
      };

      // Attach original file
      if (req.file) {
        mailOptions.attachments = [
          {
            filename: req.file.originalname,
            content: req.file.buffer,
          },
        ];
      }

      // Send mail
      await transporter.sendMail(mailOptions);

      res.json({
        success: true,
        message: "Product registered successfully",
      });
    } catch (err) {
      console.error("PRODUCT REG ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to send email",
      });
  }
});

router.post("/submit-contact", formLimiter, async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    await Inquiry.create({
      formType: "Contact",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: form,
    });

    await transporter.sendMail({
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Contact Message - ${form.subject || "Unknown"}`,
        html: `
          <h2 style="color:#166534">New Contact Message</h2>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
            <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.firstName} ${form.lastName}</td></tr>
            <tr><td><b>Email</b></td><td>${form.email}</td></tr>
            <tr style="background:#f0fdf4"><td><b>Phone</b></td><td>${form.phone || "-"}</td></tr>
            <tr><td><b>Subject</b></td><td>${form.subject || "-"}</td></tr>
            <tr style="background:#f0fdf4"><td><b>Nature of Business</b></td><td>${form.natureOfBusiness || "-"}</td></tr>
            <tr><td><b>City</b></td><td>${form.city || "-"}</td></tr>
            <tr style="background:#f0fdf4"><td><b>ZIP / PIN Code</b></td><td>${form.zipCode || "-"}</td></tr>
            <tr><td><b>Enquiry Type</b></td><td>${form.enquiryType || "-"}</td></tr>
            <tr style="background:#f0fdf4"><td><b>Message</b></td><td>${form.message || "-"}</td></tr>
          </table>
        `,
    });

    res.json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-apply", formLimiter, upload.single("resumeFile"), async (req, res) => {
  const form = req.body;
  const emailValid = await isEmailDomainValid(form.email);
  if (!emailValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address. Please enter a real email." });

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "resumes");
    await Inquiry.create({
      formType: "Job Application",
      customerName: `${form.firstName} ${form.lastName}`,
      customerEmail: form.email,
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"${form.firstName} ${form.lastName}" <${process.env.EMAIL_USER}>`,
      replyTo: form.email,
      to: process.env.COMPANY_EMAIL,
      subject: `New Job Application - ${form.firstName} ${form.lastName}`,
      html: `
      <h2 style="color:#166534">New Job Application</h2>

      <table border="1" cellpadding="8" cellspacing="0" 
      style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">

      <tr style="background:#f0fdf4">
        <td><b>Name</b></td>
        <td>${form.firstName} ${form.lastName}</td>
      </tr>

      <tr>
        <td><b>Email</b></td>
        <td>${form.email}</td>
      </tr>

      <tr style="background:#f0fdf4">
        <td><b>Phone</b></td>
        <td>${form.phone || "-"}</td>
      </tr>

      <tr>
        <td><b>Applying As</b></td>
        <td>${form.applicationType || "-"}</td>
      </tr>

      <tr style="background:#f0fdf4">
        <td><b>Availability</b></td>
        <td>${form.availability || "-"}</td>
      </tr>

      <tr>
        <td><b>About</b></td>
        <td>${form.about || "-"}</td>
      </tr>

      </table>
      `,
    };
    if (req.file)
      mailOptions.attachments = [
        { filename: req.file.originalname, content: req.file.buffer },
      ];

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

router.post("/submit-whistleblower", formLimiter, upload.single("attachmentFile"), async (req, res) => {
  const form = req.body;
  if (form.email) {
    const emailValid = await isEmailDomainValid(form.email);
    if (!emailValid)
      return res
        .status(400)
        .json({ success: false, message: "Invalid email address. Please enter a real email." });
  }

  try {
    const attachmentUrl = await uploadToFirebase(req.file, "whistleblower");
    await Inquiry.create({
      formType: "Whistleblower",
      customerName: form.name || "Anonymous",
      customerEmail: form.email || "",
      formData: { ...form, attachmentUrl },
    });

    const mailOptions = {
      from: `"${form.name || "Anonymous"} - Whistleblower" <${process.env.EMAIL_USER}>`,
      replyTo: form.email || process.env.EMAIL_USER,
      to: process.env.COMPANY_EMAIL,
      subject: `New Whistle Blower Report - ${form.name || "Anonymous"}`,
      html: `
        <h2 style="color:#166534">New Whistle Blower Report</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr style="background:#f0fdf4"><td><b>Name</b></td><td>${form.name || "-"}</td></tr>
          <tr><td><b>Telephone</b></td><td>${form.telephone || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>Email</b></td><td>${form.email || "-"}</td></tr>
          <tr><td><b>City</b></td><td>${form.city || "-"}</td></tr>
          <tr style="background:#f0fdf4"><td><b>ZIP / PIN Code</b></td><td>${form.zipCode || "-"}</td></tr>
          <tr><td><b>Comment</b></td><td>${form.comment || "-"}</td></tr>
          ${attachmentUrl ? `<tr style="background:#f0fdf4"><td><b>Attachment</b></td><td><a href="${attachmentUrl}">View Uploaded File</a></td></tr>` : ""}
        </table>
      `,
    };
    if (req.file)
      mailOptions.attachments = [
        { filename: req.file.originalname, content: req.file.buffer },
      ];

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Report submitted successfully" });
  } catch (err) {
    console.log("MAIL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();

// Contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    // In production, send email via nodemailer or save to DB
    console.log('Contact form submission:', { name, email, subject, message });

    res.json({ message: 'Message sent successfully. We will get back to you soon.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

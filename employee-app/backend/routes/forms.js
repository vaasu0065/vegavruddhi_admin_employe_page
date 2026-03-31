const express      = require('express');
const router       = express.Router();
const jwt          = require('jsonwebtoken');
const FormResponse = require('../models/FormResponse');
const Employee     = require('../models/Employee');

function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Invalid token' }); }
}

// POST /api/forms/submit
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const emp  = await Employee.findById(req.user.id).select('newJoinerName');
    const data = { ...req.body, submittedBy: req.user.id, employeeName: emp?.newJoinerName || '' };
    const form = await FormResponse.create(data);
    res.status(201).json({ message: 'Form submitted successfully', id: form._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/forms/my  — get logged-in employee's submissions
router.get('/my', verifyToken, async (req, res) => {
  try {
    const forms = await FormResponse.find({ submittedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/forms/detail/:id
router.get('/detail/:id', verifyToken, async (req, res) => {
  try {
    const form = await FormResponse.findOne({ _id: req.params.id, submittedBy: req.user.id });
    if (!form) return res.status(404).json({ message: 'Not found' });
    res.json(form);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/forms/update/:id
router.put('/update/:id', verifyToken, async (req, res) => {
  try {
    const form = await FormResponse.findOneAndUpdate(
      { _id: req.params.id, submittedBy: req.user.id },
      { $set: req.body },
      { new: true }
    );
    if (!form) return res.status(404).json({ message: 'Not found or not authorized' });
    res.json({ message: 'Updated successfully', form });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/forms/delete/:id
router.delete('/delete/:id', verifyToken, async (req, res) => {
  try {
    const form = await FormResponse.findOneAndDelete({ _id: req.params.id, submittedBy: req.user.id });
    if (!form) return res.status(404).json({ message: 'Not found or not authorized' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

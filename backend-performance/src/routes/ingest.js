/* eslint-disable no-console */
const express = require('express');
const { pool } = require('../config/db');
const { loadBusDataFromDB } = require('../state');

const router = express.Router();

router.post('/registros', async (req, res) => {
  try {
    const { ingestPivotedRecords } = require('../services/ingestionService');
    const insertedCount = await ingestPivotedRecords(req.body?.registros);
    res.json({ status: 'ok', insertedTypes: insertedCount });
  } catch (err) {
    console.error('❌ Error in /registros:', err.message);
    res.status(err.message === 'registros vacío' ? 400 : 500).json({
      status: 'error',
      error: err.toString()
    });
  }
});

module.exports = router;

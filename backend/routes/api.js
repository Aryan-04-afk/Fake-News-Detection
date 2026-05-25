const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const User = require('../models/User');
const { getDB } = require('../config/db');

// Multer setup — memory storage (no disk writes, avoids Live Server reload)
var upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        var allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.indexOf(file.mimetype) !== -1) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
        }
    }
});

// POST /api/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        await User.create({ name, email, password });

        res.status(201).json({
            success: true,
            message: 'Registration successful'
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isMatch = await User.verifyPassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        res.json({
            success: true,
            user: { name: user.name, email: user.email }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/analyze
router.post('/analyze', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide text to analyze'
            });
        }

        let mlResponse;
        try {
            mlResponse = await fetch('http://localhost:5001/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
        } catch {
            return res.status(503).json({
                success: false,
                message: 'ML service is not running. Start it with: python app.py inside ml-service/'
            });
        }

        const result = await mlResponse.json();

        // Save to history if user email is provided
        const userEmail = req.headers['x-user-email'];
        if (userEmail) {
            const db = getDB();
            await db.collection('analyses').insertOne({
                userEmail: userEmail.toLowerCase(),
                text: text.substring(0, 200),
                verdict: result.verdict,
                confidence: result.confidence,
                category: result.category || 'general',
                createdAt: new Date()
            });
        }

        res.json({ success: true, result });

    } catch (error) {
        console.error('Analyze error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/history
router.delete('/history', async (req, res) => {
    try {
        const email = req.query.email;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const db = getDB();
        await db.collection('analyses').deleteMany({ userEmail: email.toLowerCase() });

        res.json({ success: true });

    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/history
router.get('/history', async (req, res) => {
    try {
        const email = req.query.email;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const db = getDB();
        const analyses = await db.collection('analyses')
            .find({ userEmail: email.toLowerCase() })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();

        res.json({ success: true, analyses });

    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/analyze-image — send image to local PyTorch ResNet18 model
router.post('/analyze-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image file'
            });
        }

        // Forward to local fake-image-detector FastAPI service
        var formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        var apiResponse = await fetch('http://localhost:8000/predict-json/', {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        var apiResult = await apiResponse.json();

        if (apiResult.error) {
            return res.status(500).json({
                success: false,
                message: apiResult.error
            });
        }

        var score = apiResult.score;
        var verdict = 'Likely Real';
        if (apiResult.result === 'fake') {
            verdict = score > 70 ? 'AI Generated' : 'Suspicious';
        }

        // Save to history if user email is provided
        var userEmail = req.headers['x-user-email'];
        if (userEmail) {
            try {
                var imageBase64 = 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64');
                var db = getDB();
                await db.collection('analyses').insertOne({
                    userEmail: userEmail.toLowerCase(),
                    type: 'image',
                    imageData: imageBase64,
                    imageName: req.file.originalname,
                    verdict: verdict,
                    score: score,
                    createdAt: new Date()
                });
            } catch (saveErr) {
                console.error('Failed to save image analysis to history:', saveErr);
            }
        }

        res.json({
            success: true,
            result: {
                score: score,
                verdict: verdict
            }
        });

    } catch (error) {
        console.error('Image analyze error:', error);
        res.status(500).json({ success: false, message: 'Server error analyzing image' });
    }
});

module.exports = router;

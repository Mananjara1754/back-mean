const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const PDFDocument = require('pdfkit');

/**
 * @desc    Create a new payment
 * @route   POST /api/payments
 * @access  Private
 */
const createPayment = async (req, res) => {
    const { payment_type, reference, amount, period, method } = req.body;

    try {
        // Use buyer_id provided in body when available (instead of req.user)
        const buyerId = req.body.buyer_id || req.user._id;

        // If it's an order payment, verify stock first
        if (payment_type === 'order' && reference.order_id) {
            const order = await Order.findById(reference.order_id);
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Check stock for each item
            for (const item of order.items) {
                const product = await Product.findById(item.product_id);
                if (!product) {
                    return res.status(404).json({ message: `Product not found: ${item.name}` });
                }
                if (product.stock.quantity < item.quantity) {
                    return res.status(400).json({ message: `Insufficient stock for product: ${product.name}` });
                }
            }

            // If all good, reduce stock
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product_id, {
                    $inc: { 'stock.quantity': -item.quantity }
                });
            }
        }

        const paymentData = {
            payment_type,
            payer: {
                user_id: buyerId,
                role: req.user.role
            },
            reference,
            amount,
            method,
            status: 'paid', // Simulating successful payment
            paid_at: new Date()
        };

        if (payment_type === 'rent') {
            paymentData.period = period;
        }

        const payment = new Payment(paymentData);
        await payment.save();

        // Update related entity status
        if (payment_type === 'order' && reference.order_id) {
            await Order.findByIdAndUpdate(reference.order_id, {
                payment_status: 'paid',
                status: 'confirmed' // Changed from processing to confirmed as per typical flow
            });
        }

        res.status(201).json(payment);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get payment by ID
 * @route   GET /api/payments/:id
 * @access  Private
 */
const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('payer.user_id', 'profile.firstname profile.lastname profile.email username')
            .populate('reference.order_id')
            .populate('reference.shop_id');

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Access control: only admin, payer, or shop owner (for rent) can view
        if (req.user.role !== 'admin' &&
            payment.payer.user_id._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(payment);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Download payment PDF
 * @route   GET /api/payments/:id/download
 * @access  Private
 */
const downloadPaymentPDF = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('payer.user_id', 'profile.firstname profile.lastname profile.email')
            .populate({
                path: 'reference.order_id',
                populate: { path: 'shop_id', select: 'name' }
            });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Access control
        // if (req.user.role !== 'admin' && payment.payer.user_id._id.toString() !== req.user._id.toString()) {
        //     return res.status(403).json({ message: 'Not authorized' });
        // }

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payment_${payment._id}.pdf`);

        doc.pipe(res);

        // ---------------- HEADER ----------------

        // INVOICE - reste en haut à droite
        doc.fillColor('#444444').fontSize(20).text('INVOICE', { align: 'right' });

        // Bloc Ref Payment / Order / Date aligné à droite
        const rightAlignX = 50; // marge gauche du bloc
        const rightAlignWidth = 500; // largeur du bloc pour aligner le texte à droite
        let yPos = 80; // position verticale du début du bloc (sous INVOICE)

        // Ref Payment
        doc.fontSize(10).fillColor('#000000')
            .text(`Ref Payment: ${payment._id}`, rightAlignX, yPos, { width: rightAlignWidth, align: 'right' });

        // Order Number
        const orderNumber = payment.reference?.order_id?.order_number || '';
        if (orderNumber) {
            yPos += 15; // espace entre lignes
            doc.text(`Order: ${orderNumber}`, rightAlignX, yPos, { width: rightAlignWidth, align: 'right' });
        }

        // Date
        yPos += 15;
        doc.text(`Date: ${new Date(payment.paid_at || payment.created_at).toLocaleDateString()}`, rightAlignX, yPos, { width: rightAlignWidth, align: 'right' });

        doc.moveDown();

        // ---------------- LOGO / SHOP INFO ----------------
        doc.fillColor('#333333')
            .fontSize(16)
            .text('MEAN E-Commerce', 50, 50);

        doc.fontSize(10)
            .text('Antananarivo, Ivandry, 101', 50, 70)
            .moveDown();

        // ---------------- CUSTOMER INFO ----------------
        const customerName = `${payment.payer.user_id.profile?.firstname || ''} ${payment.payer.user_id.profile?.lastname || ''}`.trim() || payment.payer.user_id.username;

        doc.fontSize(12).fillColor('#333333').text('Bill To:', 50, 130);
        doc.fontSize(10).fillColor('#000000').text(customerName, 50, 145);
        doc.text(payment.payer.user_id.profile?.email || '', 50, 160);

        // Horizontal line
        doc.moveTo(50, 190).lineTo(550, 190).strokeColor('#CCCCCC').stroke();

        // ---------------- FORMAT AMOUNT ----------------
        const formatAmount = (val, curr) => {
            try {
                const n = Number(val);
                if (isNaN(n)) return `${val} ${curr || ''}`.trim();

                const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
                    .format(n)
                    .replace(/\s/g, ' '); // force espace normal

                return formatted + (curr ? ` ${curr}` : '');
            } catch (e) {
                return `${val} ${curr || ''}`.trim();
            }
        };

        // ---------------- PAYMENT SUMMARY ----------------
        doc.fontSize(12).fillColor('#333333').text('Payment Summary', 50, 210);
        doc.fontSize(10).text(`Method: ${String(payment.method || '').toUpperCase()}`, 50, 230);
        doc.text(`Status: ${String(payment.status || '').toUpperCase()}`, 50, 245);
        if (payment.payment_type === 'rent' && payment.period) {
            doc.text(`Period: ${payment.period.month}`, 50, 260);
        }

        // ---------------- ITEMS TABLE ----------------
        if (payment.payment_type === 'order' && payment.reference.order_id) {
            const order = payment.reference.order_id;
            doc.moveDown(2);
            let y = 290;

            // Table Header
            doc.fillColor('#F0F0F0').rect(50, y, 500, 20).fill();
            doc.fillColor('#333333').fontSize(10).text('Item Description', 60, y + 5);
            doc.text('Qty', 320, y + 5, { width: 50, align: 'center' });
            doc.text('Unit Price', 370, y + 5, { width: 80, align: 'right' });
            doc.text('Total', 470, y + 5, { width: 80, align: 'right' });

            y += 25;

            // Table Body
            doc.fillColor('#000000');
            order.items.forEach(item => {
                doc.text(item.name, 60, y);
                doc.text(item.quantity.toString(), 320, y, { width: 50, align: 'center' });
                doc.text(formatAmount(item.unit_price, order.amounts.currency), 370, y, { width: 80, align: 'right' });
                doc.text(formatAmount(item.total_price, order.amounts.currency), 470, y, { width: 80, align: 'right' });
                y += 20;
            });

            // Summary
            y += 10;
            doc.moveTo(350, y).lineTo(550, y).strokeColor('#CCCCCC').stroke();
            y += 10;

            doc.fontSize(10).text('Subtotal:', 350, y, { width: 100 });
            doc.text(formatAmount(order.amounts.subtotal, order.amounts.currency), 450, y, { width: 90, align: 'right' });
            y += 15;
            doc.text('Tax (20%):', 350, y, { width: 100 });
            doc.text(formatAmount(order.amounts.tax, order.amounts.currency), 450, y, { width: 90, align: 'right' });
            y += 20;

            doc.fontSize(12).fillColor('#333333').text('TOTAL:', 350, y, { width: 100, font: 'Helvetica-Bold' });
            doc.text(formatAmount(order.amounts.total, order.amounts.currency), 450, y, { width: 90, align: 'right' });

        } else if (payment.payment_type === 'rent') {
            doc.moveDown(2);
            doc.fontSize(12).text(`Rent Payment for ${payment.reference.shop_id?.name || 'Shop'}`, 50, 290);
            doc.fontSize(10).text(`Amount: ${formatAmount(payment.amount.value, payment.amount.currency)}`, 50, 310);
        }

        // ---------------- FOOTER ----------------
        doc.fontSize(10).fillColor('#999999').text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });

        doc.end();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(400).json({ message: error.message });
        }
    }

};

/**
 * @desc    Download payment PDF by Order ID
 * @route   GET /api/payments/order/:orderId/download
 * @access  Private
 */
const downloadPaymentPDFByOrder = async (req, res) => {
    try {
        const payment = await Payment.findOne({ 'reference.order_id': req.params.orderId })
            .populate('payer.user_id', 'profile.firstname profile.lastname profile.email')
            .populate({
                path: 'reference.order_id',
                populate: { path: 'shop_id', select: 'name' }
            });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found for this order' });
        }

        // Generate PDF (Same logic as downloadPaymentPDF)
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${payment.reference?.order_id?.order_number || payment._id}.pdf`);

        doc.pipe(res);

        // ---------------- HEADER ----------------
        doc.fillColor('#444444').fontSize(20).text('INVOICE', { align: 'right' });

        const rightAlignX = 50; 
        const rightAlignWidth = 500; 
        let yPos = 80; 

        doc.fontSize(10).fillColor('#000000')
            .text(`Ref Payment: ${payment._id}`, rightAlignX, yPos, { width: rightAlignWidth, align: 'right' });

        const orderNumber = payment.reference?.order_id?.order_number || '';
        if (orderNumber) {
            yPos += 15; 
            doc.text(`Order: ${orderNumber}`, rightAlignX, yPos, { width: rightAlignWidth, align: 'right' });
        }

        yPos += 15;
        doc.text(`Date: ${new Date(payment.paid_at || payment.created_at).toLocaleDateString()}`, rightAlignX, yPos, { width: rightAlignWidth, align: 'right' });

        doc.moveDown();

        // ---------------- LOGO / SHOP INFO ----------------
        doc.fillColor('#333333').fontSize(16).text('MEAN E-Commerce', 50, 50);
        doc.fontSize(10).text('Antananarivo, Ivandry, 101', 50, 70).moveDown();

        // ---------------- CUSTOMER INFO ----------------
        const customerName = `${payment.payer.user_id.profile?.firstname || ''} ${payment.payer.user_id.profile?.lastname || ''}`.trim() || payment.payer.user_id.username;

        doc.fontSize(12).fillColor('#333333').text('Bill To:', 50, 130);
        doc.fontSize(10).fillColor('#000000').text(customerName, 50, 145);
        doc.text(payment.payer.user_id.profile?.email || '', 50, 160);

        doc.moveTo(50, 190).lineTo(550, 190).strokeColor('#CCCCCC').stroke();

        const formatAmount = (val, curr) => {
            try {
                const n = Number(val);
                if (isNaN(n)) return `${val} ${curr || ''}`.trim();
                return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n).replace(/\s/g, ' ') + (curr ? ` ${curr}` : '');
            } catch (e) {
                return `${val} ${curr || ''}`.trim();
            }
        };

        // ---------------- PAYMENT SUMMARY ----------------
        doc.fontSize(12).fillColor('#333333').text('Payment Summary', 50, 210);
        doc.fontSize(10).text(`Method: ${String(payment.method || '').toUpperCase()}`, 50, 230);
        doc.text(`Status: ${String(payment.status || '').toUpperCase()}`, 50, 245);

        // ---------------- ITEMS TABLE ----------------
        if (payment.payment_type === 'order' && payment.reference.order_id) {
            const order = payment.reference.order_id;
            doc.moveDown(2);
            let y = 290;

            doc.fillColor('#F0F0F0').rect(50, y, 500, 20).fill();
            doc.fillColor('#333333').fontSize(10).text('Item Description', 60, y + 5);
            doc.text('Qty', 320, y + 5, { width: 50, align: 'center' });
            doc.text('Unit Price', 370, y + 5, { width: 80, align: 'right' });
            doc.text('Total', 470, y + 5, { width: 80, align: 'right' });

            y += 25;

            doc.fillColor('#000000');
            order.items.forEach(item => {
                const unitPrice = item.unit_price_ttc || (item.unit_price * 1.2);
                const totalPrice = item.total_price_ttc || (item.total_price * 1.2);
                
                doc.text(item.name, 60, y);
                doc.text(item.quantity.toString(), 320, y, { width: 50, align: 'center' });
                doc.text(formatAmount(unitPrice, order.amounts.currency), 370, y, { width: 80, align: 'right' });
                doc.text(formatAmount(totalPrice, order.amounts.currency), 470, y, { width: 80, align: 'right' });
                y += 20;
            });

            y += 10;
            doc.moveTo(350, y).lineTo(550, y).strokeColor('#CCCCCC').stroke();
            y += 10;

            // Updated Summary for TTC
            const tax = order.amounts.tax;
            const subtotalHT = order.amounts.subtotal;
            const totalTTC = order.amounts.total;

            doc.text('Total HT:', 350, y, { width: 100 });
            doc.text(formatAmount(subtotalHT, order.amounts.currency), 450, y, { width: 90, align: 'right' });
            y += 15;
            doc.text('TVA (20%):', 350, y, { width: 100 });
            doc.text(formatAmount(tax, order.amounts.currency), 450, y, { width: 90, align: 'right' });
            y += 20;

            doc.fontSize(12).fillColor('#333333').text('TOTAL TTC:', 350, y, { width: 100, font: 'Helvetica-Bold' });
            doc.text(formatAmount(totalTTC, order.amounts.currency), 450, y, { width: 90, align: 'right' });
        }

        doc.fontSize(10).fillColor('#999999').text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });
        doc.end();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(400).json({ message: error.message });
        }
    }
};


/**
 * @desc    Get my payments
 * @route   GET /api/payments/my-payments
 * @access  Private
 */
const getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ 'payer.user_id': req.user._id })
            .sort({ created_at: -1 });
        res.json(payments);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get payments for a specific shop (Admin/Shop)
 * @route   GET /api/payments/shop/:shop_id
 * @access  Private/Admin/Shop
 */
const getShopPayments = async (req, res) => {
    try {
        const { shop_id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Authorization: Admin or the shop owner itself
        if (req.user.role === 'shop' && req.user.shop_id.toString() !== shop_id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // We need to find payments that are either rent for this shop
        // OR payments for orders belonging to this shop.

        // 1. Find all order IDs for this shop
        const orders = await Order.find({ shop_id }).select('_id');
        const orderIds = orders.map(o => o._id);

        const query = {
            $or: [
                { 'reference.shop_id': shop_id },
                { 'reference.order_id': { $in: orderIds } }
            ]
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('payer.user_id', 'username profile.firstname profile.lastname profile.email')
            .populate('reference.order_id', 'order_number')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.json({
            payments,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get all payments (Admin)
 * @route   GET /api/payments
 * @access  Private/Admin
 */
const getAllPayments = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const payments = await Payment.find({})
            .populate('payer.user_id', 'username profile.firstname profile.lastname profile.email')
            .populate('reference.order_id', 'order_number')
            .populate('reference.shop_id', 'name')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments({});

        res.json({
            payments,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// Alias for compatibility: singular name requested
const getPaymentShop = getShopPayments;

module.exports = {
    createPayment,
    getPaymentById,
    getMyPayments,
    getAllPayments,
    getShopPayments,
    getPaymentShop,
    downloadPaymentPDF,
    downloadPaymentPDFByOrder
};

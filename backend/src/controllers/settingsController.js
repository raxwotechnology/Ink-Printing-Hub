import asyncHandler from 'express-async-handler';
import CompanySettings from '../models/CompanySettings.js';

/**
 * GET /api/settings/company
 * Get the company settings (creates a default one if it doesn't exist)
 */
export const getCompanySettings = asyncHandler(async (req, res) => {
    let settings = await CompanySettings.findOne();

    if (!settings) {
        settings = await CompanySettings.create({});
    }

    res.status(200).json({ success: true, data: settings });
});

/**
 * PUT /api/settings/company
 * Update the company settings
 */
export const updateCompanySettings = asyncHandler(async (req, res) => {
    let settings = await CompanySettings.findOne();

    if (!settings) {
        settings = new CompanySettings();
    }

    const {
        companyName, address, phone, email, website, taxRegistrationNumber, receiptFooterMessage,
        logoUrl, tagline, systemSubtitle, divisions
    } = req.body;

    if (companyName !== undefined) settings.companyName = companyName;
    if (address !== undefined) settings.address = address;
    if (phone !== undefined) settings.phone = phone;
    if (email !== undefined) settings.email = email;
    if (website !== undefined) settings.website = website;
    if (taxRegistrationNumber !== undefined) settings.taxRegistrationNumber = taxRegistrationNumber;
    if (receiptFooterMessage !== undefined) settings.receiptFooterMessage = receiptFooterMessage;
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (tagline !== undefined) settings.tagline = tagline;
    if (systemSubtitle !== undefined) settings.systemSubtitle = systemSubtitle;
    if (divisions !== undefined) {
        if (!settings.divisions) settings.divisions = {};
        if (divisions.print_shop) {
            settings.divisions.print_shop = { ...settings.divisions.print_shop, ...divisions.print_shop };
        }
        if (divisions.book_shop) {
            settings.divisions.book_shop = { ...settings.divisions.book_shop, ...divisions.book_shop };
        }
        settings.markModified('divisions');
    }

    const updatedSettings = await settings.save();
    res.status(200).json({ success: true, data: updatedSettings });
});

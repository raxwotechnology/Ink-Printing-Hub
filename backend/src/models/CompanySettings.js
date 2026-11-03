import mongoose from 'mongoose';

const divisionProfileSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    website: { type: String, trim: true },
    taxRegistrationNumber: { type: String, trim: true },
    receiptFooterMessage: { type: String, trim: true },
    logoUrl: { type: String, default: '' },
    tagline: { type: String, trim: true },
}, { _id: false });

const companySettingsSchema = new mongoose.Schema({
    companyName: { type: String, default: 'Ink Printing Hub & Pothmela Book Shop', trim: true },
    address: { type: String, default: 'Main Street', trim: true },
    phone: { type: String, default: '+94 11 XXX XXXX', trim: true },
    email: { type: String, trim: true },
    website: { type: String, trim: true },
    taxRegistrationNumber: { type: String, trim: true },
    receiptFooterMessage: { type: String, default: 'THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.', trim: true },
    logoUrl: { type: String, default: '' },
    tagline: { type: String, default: 'PRINTING, BOOKSHOP & RETAIL SYSTEM', trim: true },
    systemSubtitle: { type: String, default: 'Smart wholesale inventory, POS, and financial management.', trim: true },

    divisions: {
        print_shop: {
            type: divisionProfileSchema,
            default: () => ({
                name: 'Ink Printing Hub (pvt) Ltd',
                address: 'Main Street',
                phone: '+94 11 XXX XXXX',
                email: 'info@inkprintinghub.lk',
                receiptFooterMessage: 'THANK YOU FOR YOUR PRINTING ORDER!\nPLEASE VISIT AGAIN.',
                tagline: 'PREMIUM QUALITY PRINTING & BRANDING SOLUTIONS',
                logoUrl: '',
            })
        },
        book_shop: {
            type: divisionProfileSchema,
            default: () => ({
                name: 'Pothmela Book Shop',
                address: 'Main Street',
                phone: '+94 11 XXX XXXX',
                email: 'info@pothmela.lk',
                receiptFooterMessage: 'THANK YOU FOR SHOPPING AT POTHMELA!\nPLEASE VISIT AGAIN.',
                tagline: 'YOUR TRUSTED BOOKSTORE & STATIONERY HUB',
                logoUrl: '',
            })
        }
    }
}, { timestamps: true });

const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema);
export default CompanySettings;

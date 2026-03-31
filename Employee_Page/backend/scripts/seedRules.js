/**
 * seedRules.js
 * Run once to insert default verification rules for each month.
 * Admin panel will allow editing these later.
 *
 * Run: node backend/scripts/seedRules.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose         = require('mongoose');
const VerificationRule = require('../models/VerificationRule');

const rules = [
  // ── TIDE CONNECT (March) — Tide ecosystem products only (NOT Insurance)
  {
    collectionName: 'TL_connect_March',
    monthLabel:     'March 2026 — Tide Connect',
    active:         true,
    productTypes:   ['Tide', 'Kotak 811', 'PineLab', 'Credit Card', 'Bharat Pay',
                     'Tide Credit Card', 'Airtel Payments Bank',
                     'Equitas SF Bank', 'IndusInd Bank', 'MSME'],
    conditions: [
      { field: 'UPI_Active',     operator: 'equals', value: 'Active', label: 'UPI Onboarding Done' },
      { field: 'Stage-3',        operator: 'gte',    value: '1',      label: 'QR Done (Stage-3)'   },
      { field: 'Pass_Live',      operator: 'equals', value: 'Live',   label: 'PPI Active'          },
      { field: 'QR_Load_Amount', operator: 'gte',    value: '5000',   label: '₹5000 Txn Done'      }
    ]
  },
  // ── TIDE CONNECT (Feb)
  {
    collectionName: 'TL_connect_Feb',
    monthLabel:     'February 2026 — Tide Connect',
    active:         true,
    productTypes:   ['Tide', 'Kotak 811', 'PineLab', 'Credit Card', 'Bharat Pay',
                     'Tide Credit Card', 'Airtel Payments Bank',
                     'Equitas SF Bank', 'IndusInd Bank'],
    conditions: [
      { field: 'UPI_Active',     operator: 'equals', value: 'Active', label: 'UPI Onboarding Done' },
      { field: 'Stage-3',        operator: 'gte',    value: '1',      label: 'QR Done (Stage-3)'   },
      { field: 'Pass_Live',      operator: 'equals', value: 'Live',   label: 'PPI Active'          },
      { field: 'QR_Load_Amount', operator: 'gte',    value: '5000',   label: '₹5000 Txn Done'      }
    ]
  },
  // ── TIDE CONNECT (Jan)
  {
    collectionName: 'Priority_pass_TL_connect_Jan',
    monthLabel:     'January 2026 — Tide Connect',
    active:         true,
    productTypes:   ['Tide', 'Kotak 811', 'PineLab', 'Credit Card', 'Bharat Pay', 'Tide Credit Card'],
    conditions: [
      { field: 'UPI_Active',     operator: 'equals', value: 'Active', label: 'UPI Onboarding Done' },
      { field: 'Pass_Live',      operator: 'equals', value: 'Live',   label: 'PPI Active'          },
      { field: 'QR_Load_Amount', operator: 'gte',    value: '5000',   label: '₹5000 Txn Done'      }
    ]
  },
  // ── INSURANCE (March) — Insurance and Tide Insurance
  {
    collectionName: 'INSURANCE_MARCH',
    monthLabel:     'March 2026 — Insurance',
    active:         true,
    productTypes:   ['Insurance', 'Tide Insurance'],
    conditions: [
      { field: 'Payment_Status', operator: 'equals', value: 'Success', label: 'Payment Successful' },
      { field: 'Plan_Name',      operator: 'exists', value: '',        label: 'Plan Registered'    }
    ]
  },
  // ── INSURANCE (Feb)
  {
    collectionName: 'INSURANCE_FEB26',
    monthLabel:     'February 2026 — Insurance',
    active:         true,
    productTypes:   ['Insurance', 'Tide Insurance'],
    conditions: [
      { field: 'Payment_Status', operator: 'equals', value: 'Success', label: 'Payment Successful' },
      { field: 'Plan_Name',      operator: 'exists', value: '',        label: 'Plan Registered'    }
    ]
  },
  // ── MSME (March)
  {
    collectionName: 'MSME_MARCH',
    monthLabel:     'March 2026 — MSME',
    active:         true,
    productTypes:   ['MSME'],
    conditions: [
      { field: 'Product_Catalogue_-_Get_Registered_Product_Display_Name', operator: 'exists', value: '', label: 'MSME Product Registered' },
      { field: 'Product_Catalogue_-_Get_Registered_Sum_of_Purchase_Billing_History_Gross_Amount', operator: 'gte', value: '1', label: 'Purchase Amount > 0' }
    ]
  },
  // ── MSME (Feb)
  {
    collectionName: 'MSME_FEB26',
    monthLabel:     'February 2026 — MSME',
    active:         true,
    productTypes:   ['MSME'],
    conditions: [
      { field: 'Product_Catalogue_-_Get_Registered_Product_Display_Name', operator: 'exists', value: '', label: 'MSME Product Registered' },
      { field: 'Product_Catalogue_-_Get_Registered_Sum_of_Purchase_Billing_History_Gross_Amount', operator: 'gte', value: '1', label: 'Purchase Amount > 0' }
    ]
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const rule of rules) {
    await VerificationRule.findOneAndUpdate(
      { collectionName: rule.collectionName },
      rule,
      { upsert: true, new: true }
    );
    console.log(`✅ Rule seeded: ${rule.collectionName}`);
  }

  console.log('\nDone. Rules stored in VerificationRules collection.');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });

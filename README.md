# EventPravesh - NFT Event Ticketing Platform

A complete blockchain-powered event ticketing platform built with React, Supabase, and smart contracts on the Nexus Testnet. This project enables event hosts to create events, sell NFT tickets, and verify attendees using QR codes with 3-layer security verification.

## 🎯 Project Overview

EventPravesh is a full-stack NFT ticketing platform that combines modern web technologies with blockchain security. The platform allows:

- **Event Hosts**: Create events, manage staff, and track ticket sales
- **Attendees**: Purchase NFT tickets and access events via QR codes
- **Staff**: Verify tickets using a secure 3-layer verification system
- **Blockchain Integration**: Real NFT minting on Nexus Testnet with ERC721 smart contracts

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React QR Code** for QR generation
- **HTML5 QR Code** for scanning
- Single-file application (`EventPravesh.jsx`)

### Backend
- **Supabase** for authentication, database, and storage
- **Edge Functions** for server-side logic
- **Row Level Security (RLS)** for data protection
- **Database triggers** for automated wallet generation

### Blockchain
- **Nexus Testnet** for NFT minting
- **ERC721 Smart Contract** deployed at `0x80948605d70Ffe40786AafC68c24bfd1a786B59D`
- **Ethers.js** for blockchain interactions
- **Custodial wallet system** for seamless user experience

## 🚀 Key Features

### 1. Event Management
- Create events with comprehensive details and multiple images
- Upload banner, card, and additional images to Supabase Storage
- Manage event details (title, date, location, description)
- Event type selection (Online/Offline)
- Total seats management
- Contact information (email, mobile in Indian format)
- Venue links for easy navigation
- Multiple ticket types with different pricing
- Free and paid event options
- Edit existing events with full functionality

### 2. NFT Ticket System
- Real blockchain NFT minting on Nexus Testnet
- Automatic wallet generation for users
- Transaction hash tracking with clickable links to Nexus Explorer
- Blockchain verification for ticket authenticity
- Transparent transaction viewing

### 3. Staff Management
- Email-based staff accounts
- Event-specific staff permissions
- Secure password hashing with `btoa()`
- Persistent login sessions (24-hour duration)
- Proper logout functionality

### 4. QR Code Verification
- Cryptographically signed QR codes
- 3-layer security verification:
  1. **Signature Verification**: Ensures QR code authenticity
  2. **Database Check**: Verifies ticket hasn't been used
  3. **Blockchain Check**: Confirms NFT ownership on-chain

### 5. User Experience
- Clean, professional UI
- Responsive design
- Real-time feedback
- Error handling and fallbacks

## 📁 Project Structure

```
EventPravesh/
├── src/
│   └── EventPravesh.jsx          # Main React application
├── supabase/
│   ├── functions/                # Edge Functions
│   │   ├── buy-ticket/          # NFT minting and ticket creation
│   │   ├── get-qr-data/         # QR code generation with signatures
│   │   ├── verify-ticket/       # 3-layer ticket verification
│   │   ├── create-staff/        # Staff account creation
│   │   ├── staff-login/         # Staff authentication
│   │   └── create-custodial-wallet/ # Automatic wallet generation
│   └── migrations/              # Database schema migrations
├── Contract Source Code/        # Smart contract source
└── package.json                # Dependencies and scripts
```

## 🛠️ Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS
- Lucide React (icons)
- React QR Code
- HTML5 QR Code
- Supabase Client

### Backend
- Supabase (Auth, Database, Storage, Edge Functions)
- Deno Runtime for Edge Functions
- Ethers.js for blockchain interactions
- Row Level Security (RLS)

### Blockchain
- Nexus Testnet
- ERC721 Smart Contract
- Ethers.js v6.13.4

## 🔧 Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account
- Nexus Testnet access

### 1. Clone and Install
```bash
git clone <repository-url>
cd EventPravesh
npm install
```

### 2. Environment Variables
Create `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase Environment Variables
Set these in your Supabase project settings:
```env
PLATFORM_PRIVATE_KEY=your_platform_wallet_private_key
NEXUS_RPC_URL=https://rpc.nexus.xyz
SIGNER_PRIVATE_KEY=your_signer_private_key_for_qr_signatures
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Database Setup
Run the migrations in order:
1. `20251025152452_create_eventpravesh_schema.sql`
2. `20251025190000_add_blockchain_fields_to_tickets.sql`
3. `20251026000000_add_encrypted_private_key_to_profiles.sql`
4. `20251026000001_create_trigger_on_new_user_for_wallet.sql`
5. `20251026000002_add_rls_policies_for_event_staff.sql`
6. `20251026000003_make_username_nullable_and_add_email_to_event_staff.sql`

### 5. Deploy Edge Functions
Deploy all Edge Functions to your Supabase project:
- `buy-ticket`
- `get-qr-data`
- `verify-ticket`
- `create-staff`
- `staff-login`
- `create-custodial-wallet`

### 6. Run the Application
```bash
npm run dev
```

## 🎮 Usage Guide

### For Event Hosts

1. **Sign Up/Login**: Create an account with `is_host: true`
2. **Create Event**: 
   - Go to Host Dashboard → Create Event
   - Upload banner (1200x400px) and card (600x400px) images
   - Fill event details
3. **Manage Staff**:
   - Go to Manage Event → Manage Staff
   - Create staff accounts with email and password
4. **Track Sales**: View ticket sales and analytics

### For Attendees

1. **Browse Events**: View available events on the homepage
2. **Sign Up**: Create an account (wallet generated automatically)
3. **Buy Tickets**: Click "Buy Ticket" → "Bypass Payment (Demo)"
4. **Access QR Code**: Go to My Profile → View QR Code
5. **Attend Event**: Show QR code to staff for verification

### For Staff

1. **Staff Login**: Use the "Staff Login" button in the header
2. **Enter Credentials**: Use email and password provided by host
3. **Scan QR Codes**: Use the camera scanner to verify tickets
4. **Verification Results**: See green (valid) or red (invalid) results

## 👤 User Profile Management

### Profile Editing
- Comprehensive profile editing with modal interface
- Age, mobile number (Indian format), and bio fields
- Real-time profile updates
- Clean, user-friendly editing experience

### Host Protection
- Hosts cannot purchase tickets for their own events
- Clear messaging for host restrictions
- Separate host and attendee workflows

## 🔐 Security Features

### 1. Cryptographic Signatures
- QR codes are signed with `SIGNER_PRIVATE_KEY`
- Prevents QR code forgery
- Ensures authenticity

### 2. 3-Layer Verification
1. **Signature Check**: Verifies QR code authenticity
2. **Database Check**: Ensures ticket hasn't been used
3. **Blockchain Check**: Confirms NFT ownership on-chain

### 3. Row Level Security
- Database access controlled by RLS policies
- User data isolation
- Secure staff management

### 4. Custodial Wallets
- Users don't need to manage private keys
- Automatic wallet generation
- Seamless blockchain interaction

## 🧪 Testing

### Test Accounts

**Host Account:**
- Email: `host@eventpravesh.com`
- Password: `host123`

**Mobile Number Format**: `+919876543210` (Indian format)
**Currency**: All prices displayed in Indian Rupees (₹)
- Role: Event Host

**Staff Account:**
- Email: `chethan@gmail.com`
- Password: `12345`
- Role: Event Staff

**Attendee Account:**
- Email: `attendee@eventpravesh.com`
- Password: `attendee123`
- Role: Regular User

### Test Workflow

1. **Create Event**: Login as host, create a test event
2. **Create Staff**: Add staff member for the event
3. **Buy Ticket**: Login as attendee, purchase ticket
4. **Verify Ticket**: Login as staff, scan QR code
5. **Check Blockchain**: Verify NFT exists on Nexus Testnet

## 🚨 Troubleshooting

### Common Issues

1. **"Edge Function returned non-2xx status code"**
   - Check environment variables are set
   - Verify Edge Functions are deployed
   - Check Supabase logs

2. **"Invalid ticket" during verification**
   - Ensure ticket was purchased with real blockchain minting
   - Check if token ID exists on blockchain
   - Verify signature keys are correct

3. **Staff login issues**
   - Use email instead of username
   - Ensure staff account exists for the event
   - Check password is correct

4. **QR code not generating**
   - Verify ticket exists in database
   - Check `SIGNER_PRIVATE_KEY` is set
   - Ensure ticket hasn't been used

### Debug Steps

1. Check Supabase Edge Function logs
2. Verify environment variables
3. Test blockchain connectivity
4. Check database records
5. Validate smart contract interactions

## 🔄 Development Workflow

### Making Changes

1. **Frontend**: Edit `src/EventPravesh.jsx`
2. **Backend**: Update Edge Functions in `supabase/functions/`
3. **Database**: Create new migrations
4. **Deploy**: Update Edge Functions and run migrations

### Version Control

- All changes tracked in Git
- Edge Functions versioned automatically
- Database migrations are sequential
- Smart contract deployed once

## 📊 Performance

### Optimizations

- Single-file React application for fast loading
- Edge Functions for server-side processing
- Efficient database queries with RLS
- Optimized image uploads to Supabase Storage

### Monitoring

- Supabase Edge Function logs
- Database query performance
- Blockchain transaction monitoring
- User interaction analytics

## 🎯 Future Enhancements

### Planned Features

1. **Payment Integration**: Real payment processing
2. **Analytics Dashboard**: Detailed event analytics
3. **Mobile App**: React Native version
4. **Multi-chain Support**: Support for other blockchains
5. **Advanced Security**: Additional verification layers
6. **Event Templates**: Pre-built event configurations

### Technical Improvements

1. **Caching**: Implement Redis caching
2. **CDN**: Global content delivery
3. **Monitoring**: Advanced error tracking
4. **Testing**: Comprehensive test suite
5. **Documentation**: API documentation

## 👥 Team

**Built by Team 412 for CBIT Hacktoberfest 2025**

- **Chethan Vasthaw Tippani**
- **Giridhar Reddy**
- **Satyam Mishra**
- **Ashish Kumar**
- **Krishnaji Mutyala** 

## 📄 License

This project is developed for educational purposes as part of CBIT Hacktoberfest 2025.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section

---

**EventPravesh** - Revolutionizing event ticketing with blockchain technology! 🎫✨

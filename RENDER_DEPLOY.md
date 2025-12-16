# Quick Render Deployment Guide

## Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: PsyTech Backend API"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name:** `psytech-backend` (or your preferred name)
   - **Environment:** `Node`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** (leave empty)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for better performance)

## Step 3: Add Environment Variables

In Render Dashboard → Your Service → Environment tab, add:

### Required:
```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://aditya15152424_db_user:pdgfJgGnSxLPRQua@psytechproject.kxkcjvh.mongodb.net/psytech_db?retryWrites=true&w=majority
JWT_SECRET=86279818b6b466ccf462498dc4759211321b66dd592c205a028d77cfae12d84a
```

### Optional (add as needed):
```
JWT_EXPIRY=7d
MSG91_AUTH_KEY=your_msg91_key
MSG91_SENDER_ID=PSYTCH
MSG91_TEMPLATE_ID=your_template_id
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket
BASE_URL=https://your-app-name.onrender.com
```

## Step 4: Deploy

1. Click "Save Changes"
2. Render will automatically build and deploy
3. Wait 2-5 minutes for deployment
4. Your API will be live at: `https://your-app-name.onrender.com`

## Step 5: Test Your Deployment

```bash
# Health check
curl https://your-app-name.onrender.com/health

# Send OTP
curl -X POST https://your-app-name.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'
```

## Important Notes

- **Free Tier**: Services spin down after 15 min inactivity (first request may be slow)
- **MongoDB Atlas**: Make sure your IP whitelist includes Render's IPs (or use 0.0.0.0/0)
- **File Storage**: Use cloud storage (S3/Firebase) - local uploads are lost on restart
- **Environment Variables**: Never commit `.env` file - use Render's Environment tab

## Troubleshooting

- **Build fails?** Check build logs in Render dashboard
- **Database connection error?** Verify MONGODB_URI and MongoDB Atlas IP whitelist
- **Service won't start?** Check logs for errors, verify PORT is set


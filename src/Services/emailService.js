import nodemailer from 'nodemailer';

// Email configuration
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

// Send driver login credentials
export const sendDriverCredentials = async (driverEmail, driverPassword, driverName, companyName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"DriveMe" <noreply@driveme.com>',
            to: driverEmail,
            subject: 'Welcome to DriveMe - Your Login Credentials',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">🚗 Welcome to DriveMe</h1>
                        <h2 style="margin: 10px 0 20px 0; font-size: 20px;">Driver Account Created</h2>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Hello ${driverName},</h3>
                        <p style="color: #666; line-height: 1.6;">Your driver account has been successfully created on DriveMe platform. Below are your login credentials:</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                            <h4 style="color: #333; margin-top: 0;">🔐 Your Login Credentials:</h4>
                            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                                <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Email Address:</p>
                                <p style="margin: 0; font-size: 18px; color: #667eea; font-weight: bold;">${driverEmail}</p>
                            </div>
                            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                                <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Password:</p>
                                <p style="margin: 0; font-size: 18px; color: #667eea; font-weight: bold;">${driverPassword}</p>
                            </div>
                        </div>
                        
                        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
                            <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> Please change your password after first login for security reasons.</p>
                        </div>
                        
                        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="color: #155724; margin-top: 0;">📱 Quick Login:</h4>
                            <p style="color: #155724; margin: 5px 0;">You can now login to your driver dashboard using the credentials above.</p>
                            <p style="margin: 10px 0;">
                                <a href="${process.env.FRONTEND_URL}/login" 
                                   style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                    Login to Your Dashboard
                                </a>
                            </p>
                        </div>
                        
                        <div style="background: #f1f8e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                                ${companyName ? `<strong>Company:</strong> ${companyName}<br>` : ''}
                                <strong>Role:</strong> ${driverName.includes('Corporate') ? 'Corporate Driver' : 'B2B Partner Driver'}<br>
                                <strong>Platform:</strong> DriveMe Driver Management System
                            </p>
                        </div>
                    </div>
                    
                    <div style="background: #667eea; color: white; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
                        <p style="margin: 0; font-size: 14px;">Need help? Contact our support team</p>
                        <p style="margin: 5px 0 0 0;">
                            <a href="mailto:support@driveme.com" style="color: white; text-decoration: underline;">support@driveme.com</a> | 
                            <a href="${process.env.FRONTEND_URL}/help" style="color: white; text-decoration: underline;">Help Center</a>
                        </p>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Driver credentials email sent to: ${driverEmail}`);

        return {
            success: true,
            message: 'Email sent successfully'
        };
    } catch (error) {
        console.error('Error sending driver credentials email:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Send booking notifications
export const sendBookingNotification = async (userEmail, userName, message, bookingDetails) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"DriveMe" <noreply@driveme.com>',
            to: userEmail,
            subject: `DriveMe - ${message}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <h2>🚗 DriveMe Notification</h2>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #333;">Hello ${userName},</h3>
                        <p style="color: #666; line-height: 1.6;">${message}</p>
                        
                        ${bookingDetails ? `
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                            <h4 style="color: #333;">📋 Booking Details:</h4>
                            ${bookingDetails}
                        </div>
                        ` : ''}
                        
                        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; color: #155724;">
                                <a href="${process.env.FRONTEND_URL}/dashboard" 
                                   style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                    View Your Dashboard
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Booking notification sent to: ${userEmail}`);

        return {
            success: true,
            message: 'Notification sent successfully'
        };
    } catch (error) {
        console.error('Error sending booking notification:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

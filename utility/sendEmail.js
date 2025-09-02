import nodemailer from 'nodemailer'

export default async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: 'ykuldeep624@gmail.com',
      pass: 'oner ldmu twac lqfo'
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
}

import bcrypt from 'bcryptjs';

const password = 'Admin@123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Hash gerado:', hash);
});

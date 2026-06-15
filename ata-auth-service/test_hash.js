const argon2 = require('argon2');

async function testHash() {
  try {
    console.log('Hashing password...');
    const hash = await argon2.hash('password123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    console.log('Password hashed successfully:', hash);

    console.log('Verifying password...');
    const match = await argon2.verify(hash, 'password123');
    console.log('Password verified successfully! Match:', match);
  } catch (err) {
    console.error('Argon2 test failed:', err);
  }
}

testHash();

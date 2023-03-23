import mkcert from 'mkcert';

export const getSSL = async () => {
    // create a certificate authority
    const ca = await mkcert.createCA({
      organization: 'Hello CA',
      countryCode: 'NP',
      state: 'Bagmati',
      locality: 'Kathmandu',
      validityDays: 365
    });
    
    // then create a tls certificate
    const cert = await mkcert.createCert({
      domains: ['192.168.0.27'],
      validityDays: 365,
      caKey: ca.key,
      caCert: ca.cert
    });
    
    console.log(cert.key, cert.cert); // certificate info
    console.log(`${cert.cert}\n${ca.cert}`); // create a full chain certificate by merging CA and domain certificates
    return cert
}


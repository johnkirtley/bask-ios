/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['posturepal.s3.us-east-2.amazonaws.com']
    },
    output: 'export'
}

module.exports = nextConfig

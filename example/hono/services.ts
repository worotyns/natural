
export const services = {
  generateCode(): Promise<number> {
    return Promise.resolve(Math.floor(100000 + Math.random() * 900000));
  },
  async sendEmail(email: string, code: number): Promise<boolean> {
    console.log("sending email...", email, code);
    await new Promise((resolve) => setTimeout(resolve, 120));
    return true;
  },
};
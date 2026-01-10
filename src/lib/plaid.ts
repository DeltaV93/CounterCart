import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const PLAID_PRODUCTS = [Products.Transactions];
export const PLAID_COUNTRY_CODES = [CountryCode.Us];

export function normalizeMerchantName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[#\d]+/g, "") // Remove store numbers
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[^\w\s]/g, "") // Remove special chars
    .trim();
}

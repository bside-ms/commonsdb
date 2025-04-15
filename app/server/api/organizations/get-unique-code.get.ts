import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

export default defineEventHandler(async (event) => {
  let code = null;
  while (
    !code ||
    (await prisma.organization.count({
      where: {
        code,
      },
    }))
  ) {
    code = generateCode();
  }

  return code;
});

const generateCode = () => {
  const mnemonicsArray = bip39.generateMnemonic(wordlist).split(" ");
  return mnemonicsArray.slice(0, 3).join("-");
};

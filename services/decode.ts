export interface CreateInstructionParams {
    tokenName: string;
    symbol: string;
    uri: string;
}

export function encodeCreateInstruction(params: CreateInstructionParams): string {
    // Anchor discriminator for 'create' instruction
    const discriminator = Buffer.from('181ec828051c0777', 'hex');
    
    // Prepare buffers for each string
    const nameBuffer = Buffer.from(params.tokenName, 'utf8');
    const symbolBuffer = Buffer.from(params.symbol, 'utf8');
    const uriBuffer = Buffer.from(params.uri, 'utf8');
    
    // Calculate total size
    const totalSize = 
        discriminator.length + // 8 bytes discriminator
        4 + nameBuffer.length + // 4 bytes length + name
        4 + symbolBuffer.length + // 4 bytes length + symbol
        4 + uriBuffer.length; // 4 bytes length + uri
    
    // Create result buffer
    const resultBuffer = Buffer.alloc(totalSize);
    let offset = 0;
    
    try {
        // Write discriminator
        discriminator.copy(resultBuffer, offset);
        offset += discriminator.length;
        
        // Write name
        resultBuffer.writeUInt32LE(nameBuffer.length, offset);
        offset += 4;
        nameBuffer.copy(resultBuffer, offset);
        offset += nameBuffer.length;
        
        // Write symbol
        resultBuffer.writeUInt32LE(symbolBuffer.length, offset);
        offset += 4;
        symbolBuffer.copy(resultBuffer, offset);
        offset += symbolBuffer.length;
        
        // Write uri
        resultBuffer.writeUInt32LE(uriBuffer.length, offset);
        offset += 4;
        uriBuffer.copy(resultBuffer, offset);
        
        return resultBuffer.toString('hex');
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`Failed to encode instruction data: ${error.message}`);
        }
        throw new Error('Failed to encode instruction data: Unknown error');
    }
}

// Optional: Export constants if needed
export const INSTRUCTION_DISCRIMINATOR = '181ec828051c0777';

// Example usage (can be commented out or removed when using as a module)
/*
const params: CreateInstructionParams = {
    tokenName: "new data decode",
    symbol: "DTT",
    uri: "https://ipfs.io/ipfs/QmYmxnDxNNLXVUcfBwd6gVogMU5snax9hLgHc15J2SY6eS"
};

const encoded = encodeCreateInstruction(params);
console.log("Encoded instruction data:", encoded);
*/
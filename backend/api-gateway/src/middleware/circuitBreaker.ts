import CircuitBreaker from "opossum";
import http from "http";

const defaultOptions: CircuitBreaker.Options = {
    timeout: 3000,              // If action takes longer than 3s, trigger failure
    errorThresholdPercentage: 50, // When 50% of requests fail, open circuit
    resetTimeout: 10000,        // After 10s, try half-open state to test recovery
};

/**
 * Creates an Opossum Circuit Breaker wrapper for downstream HTTP services
 */
export const createServiceCircuitBreaker = (serviceName: string, fallbackResponse: any = {}) => {
    const action = async (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const req = http.get(url, { timeout: 3000 }, (res) => {
                if (res.statusCode && res.statusCode >= 500) return reject(new Error(`Service ${serviceName} returned ${res.statusCode}`));
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => resolve(data));
            });
            req.on("error", reject);
            req.on("timeout", () => {
                req.destroy();
                reject(new Error(`Service ${serviceName} request timed out`));
            });
        });
    };

    const breaker = new CircuitBreaker(action, defaultOptions);

    breaker.fallback(() => JSON.stringify({
        status: "CIRCUIT_OPEN",
        message: `Service ${serviceName} is currently unavailable. Serving fallback data.`,
        fallback: fallbackResponse,
    }));

    breaker.on("open", () => console.warn(`⚠️ [Circuit Breaker OPEN] ${serviceName} circuit tripped!`));
    breaker.on("halfOpen", () => console.log(`🟡 [Circuit Breaker HALF-OPEN] Testing ${serviceName} recovery...`));
    breaker.on("close", () => console.log(`✅ [Circuit Breaker CLOSED] ${serviceName} is healthy.`));

    return breaker;
};

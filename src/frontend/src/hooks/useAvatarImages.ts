import { Principal } from "@icp-sdk/core/principal";
import { useQueries } from "@tanstack/react-query";
import { useActor } from "./useActor";

/**
 * Batch-loads avatar images for a list of principals.
 * Returns a Map<principalString, string | null>.
 */
export function useAvatarImages(
  principals: string[],
): Map<string, string | null> {
  const { actor } = useActor();

  const uniquePrincipals = Array.from(new Set(principals.filter(Boolean)));

  const results = useQueries({
    queries: uniquePrincipals.map((principalStr) => ({
      queryKey: ["avatarImage", principalStr],
      queryFn: async (): Promise<string | null> => {
        if (!actor) return null;
        try {
          const principalObj = Principal.fromText(principalStr);
          return await actor.getAvatarImage(principalObj);
        } catch {
          return null;
        }
      },
      enabled: !!actor && !!principalStr,
      staleTime: 60000,
      retry: 0,
    })),
  });

  const map = new Map<string, string | null>();
  uniquePrincipals.forEach((p, i) => {
    const result = results[i];
    if (result?.data !== undefined) {
      map.set(p, result.data);
    } else {
      map.set(p, null);
    }
  });

  return map;
}

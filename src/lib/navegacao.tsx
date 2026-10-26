"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { forwardRef, useCallback, type AnchorHTMLAttributes, type ComponentProps } from "react";

export type Busca = Record<string, string | number | boolean | undefined>;

export type Destino = {
  to?: string | undefined;
  params?: Record<string, string> | undefined;
  search?: Busca | undefined;
};

export function montarUrl({ to, params, search }: Destino, atual = "/") {
  const caminho = (to ?? atual).replace(/\$(\w+)/g, (_, nome: string) =>
    encodeURIComponent(params?.[nome] ?? ""),
  );
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(search ?? {})) if (v !== undefined) qs.set(k, String(v));
  const q = qs.toString();
  return q ? `${caminho}?${q}` : caminho;
}

type LinkProps = Destino &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { replace?: boolean };

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, params, search, replace, ...rest },
  ref,
) {
  const props = rest as Omit<ComponentProps<typeof NextLink>, "href">;
  return (
    <NextLink ref={ref} href={montarUrl({ to, params, search })} replace={!!replace} {...props} />
  );
});

export function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (d: Destino & { replace?: boolean; resetScroll?: boolean }) => {
      const url = montarUrl(d, pathname);
      const opts = { scroll: d.resetScroll ?? true };
      if (d.replace) router.replace(url, opts);
      else router.push(url, opts);
    },
    [router, pathname],
  );
}

export { usePathname };

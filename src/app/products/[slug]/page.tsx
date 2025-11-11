import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { addToCart } from "@/app/cart/actions";
import VariantControls from "./VariantControls";

export const runtime = "nodejs";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sort: "asc" } },
      variants: { orderBy: { name: "asc" } },
    },
  });

  if (!product || !product.published) notFound();

  const session = await getSession();
  const requiresLogin = !session;
  const productPath = `/products/${slug}`;
  const loginHref = `/login?next=${encodeURIComponent(productPath)}`;
  const cover = product.images[0]?.url;

  return (
    <main
      style={{
        maxWidth: 1040,
        margin: "24px auto",
        display: "grid",
        gap: 24,
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      <section>
        {cover ? (
          <Image
            src={cover}
            alt={product.name}
            width={800}
            height={1000}
            style={{ width: "100%", height: "auto", borderRadius: 12, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              aspectRatio: "4/5",
              border: "1px dashed #ddd",
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              color: "#777",
              fontSize: 13,
            }}
          >
            Image not available
          </div>
        )}

        <ul
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12,
            alignItems: "center",
          }}
        >
          {product.images.map((img) => (
            <li key={img.id}>
              <Image
                src={img.url}
                alt={product.name}
                width={140}
                height={140}
                style={{ borderRadius: 8, objectFit: "cover" }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>{product.name}</h1>
        <div style={{ opacity: 0.7, margin: "4px 0 12px" }}>{product.slug}</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
          {product.price.toLocaleString()} KRW
        </div>
        {product.description && (
          <p style={{ opacity: 0.8, marginBottom: 16 }}>{product.description}</p>
        )}

        <form action={addToCart} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
          <input type="hidden" name="productId" value={product.id} />

          {product.variants.length > 0 ? (
            <VariantControls
              variants={product.variants.map((v) => ({
                id: v.id,
                name: v.name,
                stock: v.stock ?? 0,
                extra: v.extra ?? 0,
              }))}
              submitButtonId="addToCartBtn"
            />
          ) : (
            <input type="hidden" name="variantId" value="" />
          )}

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 64 }}>Qty</span>
            <input
              name="qty"
              type="number"
              inputMode="numeric"
              defaultValue={1}
              min={1}
              max={999}
              style={{ width: 100 }}
              disabled={requiresLogin}
            />
          </label>

          {requiresLogin && (
            <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
              Log in to add this product to your cart.
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              id="addToCartBtn"
              type="submit"
              style={{ padding: "8px 12px" }}
              {...(requiresLogin ? { formAction: loginHref, formMethod: "get" as const } : {})}
            >
              Add to cart
            </button>
            <Link
              href={requiresLogin ? loginHref : "/cart"}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              View cart
            </Link>
          </div>
        </form>

        {product.variants.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
            {product.variants.map((v) => (
              <div key={v.id}>
                {v.name} - {(v.stock ?? 0) > 0 ? `In stock ${v.stock}` : "Sold out"}
                {v.extra ? ` +${v.extra.toLocaleString()} KRW` : ""}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

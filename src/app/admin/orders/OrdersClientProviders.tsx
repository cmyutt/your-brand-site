"use client";
// CODPATCH: OrdersClientProviders — wrap children with RowPatchProvider
import React from "react";
import { RowPatchProvider } from "./RowPatchContext";

export default function OrdersClientProviders({ children }: { children: React.ReactNode }) {
  return <RowPatchProvider>{children}</RowPatchProvider>;
}


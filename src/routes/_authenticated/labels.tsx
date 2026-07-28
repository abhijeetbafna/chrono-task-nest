import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/labels")({
  head: () => ({
    meta: [
      { title: "Labels & buckets — TaskNest" },
    ],
  }),
  component: LabelsPage,
});

function LabelsPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/settings", search: { tab: "buckets" }, replace: true });
  }, [navigate]);

  return null;
}
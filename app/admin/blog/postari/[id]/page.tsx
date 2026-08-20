"use client";

import { use } from "react";
import SocialPostEditor from "@/components/admin/SocialPostEditor";

export default function EditSocialPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SocialPostEditor postId={id} />;
}

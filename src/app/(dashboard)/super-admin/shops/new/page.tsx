"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NewShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    phone: "",
    email: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name
    if (name === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("PT샵 이름을 입력해주세요.");
      return;
    }

    if (!formData.slug.trim()) {
      toast.error("슬러그를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const shop = await response.json();
        toast.success("PT샵이 등록되었습니다.");
        router.push(`/super-admin/shops/${shop.id}`);
      } else {
        const data = await response.json();
        toast.error(data.error || "PT샵 등록에 실패했습니다.");
      }
    } catch (error) {
      toast.error("PT샵 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/super-admin/shops">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">새 PT샵 등록</h1>
          <p className="text-muted-foreground">새로운 PT샵을 시스템에 등록합니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>PT샵의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">PT샵 이름 *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="예: 강남 피트니스"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">슬러그 (URL) *</Label>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="예: gangnam-fitness"
                  value={formData.slug}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  URL에 사용될 고유 식별자입니다. 영문, 숫자, 하이픈만 사용할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="PT샵에 대한 간단한 설명을 입력하세요"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="02-1234-5678"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="info@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                name="address"
                placeholder="서울시 강남구 ..."
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href="/super-admin/shops">취소</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "등록 중..." : "PT샵 등록"}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  UserCog,
  CreditCard,
  CalendarDays,
  ClipboardCheck,
  UserPlus,
  Pencil,
  Save,
  X,
  LogIn,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Shop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    users: number;
    memberProfiles: number;
    trainerProfiles: number;
    payments: number;
    schedules: number;
    attendances: number;
  };
  stats: {
    totalRevenue: number;
    monthlyRevenue: number;
  };
  admins: Array<{
    id: string;
    email: string;
    name: string;
    phone: string | null;
    createdAt: string;
  }>;
}

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = params.id as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "true");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    isActive: true,
  });

  // Admin creation dialog
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminData, setAdminData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Impersonation state
  const [impersonateAdmin, setImpersonateAdmin] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  const fetchShop = async () => {
    try {
      const response = await fetch(`/api/super-admin/shops/${shopId}`);
      if (response.ok) {
        const data = await response.json();
        setShop(data);
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          isActive: data.isActive,
        });
      } else {
        toast.error("PT샵을 찾을 수 없습니다.");
        router.push("/super-admin/shops");
      }
    } catch (error) {
      console.error("Failed to fetch shop:", error);
      toast.error("PT샵 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShop();
  }, [shopId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/super-admin/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("PT샵 정보가 저장되었습니다.");
        setIsEditing(false);
        fetchShop();
      } else {
        const data = await response.json();
        toast.error(data.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!adminData.name || !adminData.email || !adminData.password) {
      toast.error("필수 정보를 입력해주세요.");
      return;
    }

    setAddingAdmin(true);
    try {
      const response = await fetch(`/api/super-admin/shops/${shopId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminData),
      });

      if (response.ok) {
        toast.success("관리자가 추가되었습니다.");
        setShowAddAdmin(false);
        setAdminData({ name: "", email: "", password: "", phone: "" });
        fetchShop();
      } else {
        const data = await response.json();
        toast.error(data.error || "관리자 추가에 실패했습니다.");
      }
    } catch (error) {
      toast.error("관리자 추가에 실패했습니다.");
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleImpersonate = async () => {
    if (!impersonateAdmin) return;

    setImpersonating(true);
    try {
      const response = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: impersonateAdmin.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "관리자 로그인에 실패했습니다.");
        return;
      }

      toast.success(`${impersonateAdmin.name} 관리자로 전환했습니다.`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("관리자 계정으로 로그인하는데 실패했습니다.");
    } finally {
      setImpersonating(false);
      setImpersonateAdmin(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!shop) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/super-admin/shops">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{shop.name}</h1>
              <Badge variant={shop.isActive ? "default" : "secondary"}>
                {shop.isActive ? "활성" : "비활성"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{shop.slug}</p>
          </div>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  name: shop.name,
                  slug: shop.slug,
                  description: shop.description || "",
                  address: shop.address || "",
                  phone: shop.phone || "",
                  email: shop.email || "",
                  isActive: shop.isActive,
                });
              }}
            >
              <X className="mr-2 h-4 w-4" />
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            수정
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">회원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shop._count.memberProfiles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">트레이너</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shop._count.trainerProfiles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">예약</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shop._count.schedules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">출석</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shop._count.attendances}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">월 매출</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(shop.stats.monthlyRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">누적 매출</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(shop.stats.totalRevenue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shop Info */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>PT샵의 기본 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">PT샵 이름</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">슬러그</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  name="description"
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
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
                <Label htmlFor="isActive">활성 상태</Label>
              </div>
            </>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">설명</p>
                <p>{shop.description || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전화번호</p>
                <p>{shop.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이메일</p>
                <p>{shop.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">주소</p>
                <p>{shop.address || "-"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>관리자</CardTitle>
            <CardDescription>이 PT샵의 관리자 목록</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAddAdmin(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            관리자 추가
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>전화번호</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead className="w-[80px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shop.admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">등록된 관리자가 없습니다.</p>
                  </TableCell>
                </TableRow>
              ) : (
                shop.admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.phone || "-"}</TableCell>
                    <TableCell>
                      {new Date(admin.createdAt).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setImpersonateAdmin({
                            id: admin.id,
                            name: admin.name,
                            email: admin.email,
                          })
                        }
                        title="관리자로 로그인"
                      >
                        <LogIn className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관리자 추가</DialogTitle>
            <DialogDescription>
              이 PT샵의 새 관리자를 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">이름 *</Label>
              <Input
                id="admin-name"
                value={adminData.name}
                onChange={(e) =>
                  setAdminData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="홍길동"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">이메일 *</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminData.email}
                onChange={(e) =>
                  setAdminData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">비밀번호 *</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminData.password}
                onChange={(e) =>
                  setAdminData((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="비밀번호"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-phone">전화번호</Label>
              <Input
                id="admin-phone"
                value={adminData.phone}
                onChange={(e) =>
                  setAdminData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="010-1234-5678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddAdmin(false)}
              disabled={addingAdmin}
            >
              취소
            </Button>
            <Button onClick={handleAddAdmin} disabled={addingAdmin}>
              {addingAdmin ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate Admin Confirmation Dialog */}
      <ConfirmDialog
        open={!!impersonateAdmin}
        onOpenChange={(open) => {
          if (!open) setImpersonateAdmin(null);
        }}
        title="관리자 계정으로 로그인"
        description={
          impersonateAdmin
            ? `${impersonateAdmin.name} (${impersonateAdmin.email}) 관리자로 전환하시겠습니까?`
            : ""
        }
        confirmLabel="로그인"
        onConfirm={handleImpersonate}
        isLoading={impersonating}
      />
    </div>
  );
}

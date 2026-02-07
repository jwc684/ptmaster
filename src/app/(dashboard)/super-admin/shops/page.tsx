"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Users,
  UserCog,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
  };
  stats: {
    totalRevenue: number;
    monthlyRevenue: number;
  };
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteShopId, setDeleteShopId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchShops = async () => {
    try {
      const response = await fetch("/api/super-admin/shops?includeStats=true");
      if (response.ok) {
        const data = await response.json();
        setShops(data);
      }
    } catch (error) {
      console.error("Failed to fetch shops:", error);
      toast.error("PT샵 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleDelete = async () => {
    if (!deleteShopId) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/super-admin/shops/${deleteShopId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("PT샵이 비활성화되었습니다.");
        fetchShops();
      } else {
        const data = await response.json();
        toast.error(data.error || "PT샵 비활성화에 실패했습니다.");
      }
    } catch (error) {
      toast.error("PT샵 비활성화에 실패했습니다.");
    } finally {
      setDeleting(false);
      setDeleteShopId(null);
    }
  };

  const handleImpersonateShopAdmin = async (shopId: string, shopName: string) => {
    try {
      const tokenResponse = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });

      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        toast.error(data.error || "로그인 토큰 생성에 실패했습니다.");
        return;
      }

      const { token } = await tokenResponse.json();
      window.open(
        `/login?impersonateToken=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent("/dashboard")}`,
        "_blank"
      );
      toast.success(`${shopName} 관리자 계정으로 새 탭에서 로그인합니다.`);
    } catch {
      toast.error("관리자 계정으로 로그인하는데 실패했습니다.");
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PT샵 관리</h1>
            <p className="text-muted-foreground">등록된 모든 PT샵을 관리합니다</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PT샵</TableHead>
                  <TableHead>회원</TableHead>
                  <TableHead>트레이너</TableHead>
                  <TableHead>월 매출</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-8" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PT샵 관리</h1>
          <p className="text-muted-foreground">
            등록된 모든 PT샵을 관리합니다 ({shops.length}개)
          </p>
        </div>
        <Button asChild>
          <Link href="/super-admin/shops/new">
            <Plus className="mr-2 h-4 w-4" />
            새 PT샵 등록
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PT샵</TableHead>
                <TableHead>회원</TableHead>
                <TableHead>트레이너</TableHead>
                <TableHead>월 매출</TableHead>
                <TableHead>누적 매출</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">등록된 PT샵이 없습니다.</p>
                      <Button asChild size="sm" className="mt-2">
                        <Link href="/super-admin/shops/new">
                          <Plus className="mr-2 h-4 w-4" />
                          첫 PT샵 등록하기
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                shops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{shop.name}</div>
                        <div className="text-xs text-muted-foreground">{shop.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {shop._count.memberProfiles}명
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                        {shop._count.trainerProfiles}명
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(shop.stats.monthlyRevenue)}</TableCell>
                    <TableCell>{formatCurrency(shop.stats.totalRevenue)}</TableCell>
                    <TableCell>
                      <Badge variant={shop.isActive ? "default" : "secondary"}>
                        {shop.isActive ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/super-admin/shops/${shop.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              상세보기
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/super-admin/shops/${shop.id}?edit=true`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              수정
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleImpersonateShopAdmin(shop.id, shop.name)}
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            관리자로 로그인
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteShopId(shop.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            비활성화
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteShopId} onOpenChange={() => setDeleteShopId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>PT샵 비활성화</AlertDialogTitle>
            <AlertDialogDescription>
              이 PT샵을 비활성화하시겠습니까? 비활성화된 PT샵은 목록에서 숨겨지지만 데이터는 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "처리 중..." : "비활성화"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

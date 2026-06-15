import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { terraformApi } from '@/lib/api/terraform.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Layers,
  Columns,
  GitCompare,
  ArrowRightLeft,
  ChevronUp,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';

interface TerraformViewProps {
  projectId: string;
  generationId: string;
  projectName: string;
  cloudProvider: 'aws' | 'azure' | 'gcp';
  spec: any;
}

export function TerraformView({
  projectId,
  generationId,
  projectName,
  cloudProvider,
  spec,
}: TerraformViewProps) {
  const queryClient = useQueryClient();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState(false);
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);

  // 1. Fetch project versions history
  const { data: versions, isLoading: loadingVersions, refetch: refetchVersions } = useQuery({
    queryKey: ['terraform-versions', projectId],
    queryFn: () => terraformApi.getProjectVersions(projectId),
  });

  // Reset selected version when generationId changes
  useEffect(() => {
    setSelectedVersionId(null);
    setSelectedFilePath(null);
    setDiffMode(false);
  }, [generationId]);

  // Find the version corresponding to the current generation
  const currentGenVersion = versions?.find((v: any) => v.generationId === generationId);

  useEffect(() => {
    if (versions && versions.length > 0 && !selectedVersionId) {
      // Default to current generation version if found, otherwise latest version
      if (currentGenVersion) {
        setSelectedVersionId(currentGenVersion.id);
      } else {
        setSelectedVersionId(versions[0].id);
      }
    }
  }, [versions, currentGenVersion, selectedVersionId]);

  // 2. Fetch selected version details (includes validation status, logs)
  const { data: versionDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['terraform-version-details', selectedVersionId],
    queryFn: () => terraformApi.getVersionDetails(selectedVersionId!),
    enabled: !!selectedVersionId,
  });

  // 3. Fetch files list for the selected version
  const { data: files, isLoading: loadingFiles } = useQuery({
    queryKey: ['terraform-version-files', selectedVersionId],
    queryFn: () => terraformApi.getVersionFiles(selectedVersionId!),
    enabled: !!selectedVersionId,
  });

  // 4. Fetch content of selected file
  const { data: fileContent, isLoading: loadingContent } = useQuery({
    queryKey: ['terraform-file-content', selectedVersionId, selectedFilePath],
    queryFn: () => terraformApi.getFileContent(selectedVersionId!, selectedFilePath!),
    enabled: !!selectedVersionId && !!selectedFilePath,
  });

  // 5. Fetch diff between selected version and compared version
  const { data: diffs, isLoading: loadingDiffs } = useQuery({
    queryKey: ['terraform-diff', selectedVersionId, diffVersionId],
    queryFn: () => terraformApi.getDiff(diffVersionId!, selectedVersionId!),
    enabled: diffMode && !!selectedVersionId && !!diffVersionId,
  });

  // Mutation to generate Terraform
  const generateMutation = useMutation({
    mutationFn: () =>
      terraformApi.generate({
        projectId,
        generationId,
        name: projectName,
        cloudProvider,
        spec,
      }),
    onSuccess: (data) => {
      toast.success('Terraform generation initiated');
      // Invalidate queries to trigger loading state updates
      queryClient.invalidateQueries({ queryKey: ['terraform-versions', projectId] });
      // Poll versions to check completion
      let attempts = 0;
      const interval = setInterval(async () => {
        const res = await refetchVersions();
        attempts++;
        const updated = res.data?.find((v: any) => v.generationId === generationId);
        if (updated && (updated.status === 'completed' || updated.status === 'failed') || attempts > 15) {
          clearInterval(interval);
          if (updated) {
            setSelectedVersionId(updated.id);
            if (updated.status === 'completed') {
              toast.success('Terraform configuration generated and validated successfully!');
            } else {
              toast.error('Terraform validation failed. Check logs.');
            }
          }
        }
      }, 2000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to start Terraform generation';
      toast.error(msg);
    },
  });

  // Build File Tree
  const buildFileTree = () => {
    if (!files) return null;
    const tree: any = {};
    files.forEach((f: any) => {
      const parts = f.filePath.split('/');
      let current = tree;
      parts.forEach((part: string, idx: number) => {
        if (idx === parts.length - 1) {
          current[part] = f;
        } else {
          if (!current[part]) current[part] = {};
          current[part] = current[part];
        }
      });
    });
    return tree;
  };

  const fileTree = buildFileTree();

  // Selected file default
  useEffect(() => {
    if (files && files.length > 0 && !selectedFilePath) {
      // Prefer main.tf
      const mainFile = files.find((f: any) => f.filePath === 'main.tf');
      if (mainFile) {
        setSelectedFilePath('main.tf');
      } else {
        setSelectedFilePath(files[0].filePath);
      }
    }
  }, [files, selectedFilePath]);

  const RenderFileNode = ({ name, node, path = '' }: { name: string; node: any; path?: string }) => {
    const currentPath = path ? `${path}/${name}` : name;
    const isFile = !!node.id;
    const [isOpen, setIsOpen] = useState(true);

    if (isFile) {
      const isSelected = selectedFilePath === node.filePath;
      return (
        <button
          onClick={() => {
            setDiffMode(false);
            setSelectedFilePath(node.filePath);
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs transition-colors ${
            isSelected
              ? 'bg-indigo-600 text-white font-medium shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <File className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
          <span className="truncate">{name}</span>
        </button>
      );
    }

    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-semibold"
        >
          {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <Folder className="h-4 w-4 text-indigo-400 flex-shrink-0" />
          <span className="truncate">{name}</span>
        </button>
        {isOpen && (
          <div className="pl-4 border-l border-slate-100 dark:border-slate-800 ml-4 space-y-1">
            {Object.entries(node).map(([childName, childNode]) => (
              <RenderFileNode key={childName} name={childName} node={childNode} path={currentPath} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
            <XCircle className="h-3.5 w-3.5" /> Validation Failed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-400">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> In Progress
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Terraform Generator</h2>
          <p className="text-xs text-muted-foreground">Compile and validate standard HCL architectures</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Version Selector */}
          {versions && versions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Active Run:</span>
              <select
                value={selectedVersionId || ''}
                onChange={(e) => {
                  setSelectedVersionId(e.target.value);
                  setSelectedFilePath(null);
                  setDiffMode(false);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                {versions.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    Run #{v.versionNumber} ({v.status === 'completed' ? 'Success' : 'Failed'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Trigger button */}
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || (currentGenVersion && currentGenVersion.status === 'pending')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-1.5"
          >
            {generateMutation.isPending ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin mr-1.5" /> Generating...
              </>
            ) : currentGenVersion ? (
              'Regenerate HCL'
            ) : (
              'Compile Terraform Code'
            )}
          </Button>

          {/* Diff Mode Toggle */}
          {versions && versions.length > 1 && selectedVersionId && (
            <Button
              variant={diffMode ? 'default' : 'outline'}
              onClick={() => {
                setDiffMode(!diffMode);
                if (!diffMode && !diffVersionId) {
                  // Default compared run to preceding run
                  const currentIdx = versions.findIndex((v: any) => v.id === selectedVersionId);
                  const preceding = versions[currentIdx + 1] || versions[0];
                  setDiffVersionId(preceding.id);
                }
              }}
              className="font-semibold text-xs py-1.5 flex items-center gap-1.5"
            >
              <GitCompare className="h-4 w-4" /> Compare Versions
            </Button>
          )}
        </div>
      </div>

      {/* If No Versions Exist */}
      {(!versions || versions.length === 0) && !generateMutation.isPending && (
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-4">
            <Layers className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 animate-pulse" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">No Terraform Code Generated Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Transform your validated Infrastructure Specification into complete, runnable Terraform modules in one click.
              </p>
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            >
              Generate HCL Files
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main UI Layout */}
      {selectedVersionId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Files and Validation Details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Status Card */}
            {versionDetails?.version && (
              <Card className="shadow-sm border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pipeline Status</span>
                    {getStatusBadge(versionDetails.version.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs pb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Validated Pass:</span>
                    <span className={`font-bold ${versionDetails.version.validationPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {versionDetails.version.validationPassed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">File Count:</span>
                    <span className="font-semibold">{versionDetails.version.fileCount || 0} Files</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Size:</span>
                    <span className="font-semibold">
                      {versionDetails.version.totalSizeBytes ? `${(versionDetails.version.totalSizeBytes / 1024).toFixed(2)} KB` : '0 KB'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File Explorer */}
            <Card className="shadow-sm border-slate-100 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
                <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Generated Directory</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 p-2 max-h-[400px] overflow-y-auto">
                {loadingFiles ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading files...
                  </div>
                ) : fileTree && Object.keys(fileTree).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(fileTree).map(([name, node]) => (
                      <RenderFileNode key={name} name={name} node={node} />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">No files generated.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Content / Diff / Logs */}
          <div className="lg:col-span-9 space-y-6">
            {/* Diff Selector Bar */}
            {diffMode && (
              <Card className="shadow-sm border-indigo-100 dark:border-indigo-950 bg-indigo-50/10 dark:bg-indigo-950/10">
                <CardContent className="py-3 px-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <GitCompare className="h-5 w-5 text-indigo-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Comparing Base Run:</span>
                    <select
                      value={diffVersionId || ''}
                      onChange={(e) => setDiffVersionId(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs"
                    >
                      {versions
                        ?.filter((v: any) => v.id !== selectedVersionId)
                        .map((v: any) => (
                          <option key={v.id} value={v.id}>
                            Run #{v.versionNumber} ({v.status === 'completed' ? 'Success' : 'Failed'})
                          </option>
                        ))}
                    </select>
                    <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Target Run:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Run #{versions?.find((v: any) => v.id === selectedVersionId)?.versionNumber}</span>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => setDiffMode(false)}
                    className="text-xs h-7 hover:bg-slate-100 dark:hover:bg-slate-900 font-semibold"
                  >
                    Close Compare
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* If Diff Mode is active */}
            {diffMode ? (
              <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
                  <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Columns className="h-4 w-4 text-indigo-500" /> Version Diff Outputs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingDiffs ? (
                    <div className="py-24 text-center text-xs text-muted-foreground">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" /> Generating diff comparisons...
                    </div>
                  ) : diffs && diffs.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                      {diffs.map((diff: any) => {
                        if (diff.status === 'unchanged') return null;
                        const isAdded = diff.status === 'added';
                        const isDeleted = diff.status === 'deleted';
                        const isModified = diff.status === 'modified';

                        return (
                          <div key={diff.filePath} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold flex items-center gap-2">
                                <FileText className="h-4.5 w-4.5 text-indigo-500" />
                                {diff.filePath}
                              </span>
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                  isAdded
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                                    : isDeleted
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-955/30'
                                }`}
                              >
                                {diff.status}
                              </span>
                            </div>

                            {/* Side by side diff or standard view */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px] mt-1.5">
                              {/* Left side: Older version */}
                              {!isAdded && (
                                <div className="border border-rose-100 dark:border-rose-900/30 rounded-lg p-3 bg-rose-50/5 dark:bg-rose-950/5">
                                  <div className="text-[10px] text-rose-500 font-bold uppercase mb-2">Original Content</div>
                                  <pre className="overflow-x-auto whitespace-pre-wrap max-h-48 text-rose-700 dark:text-rose-400">
                                    {diff.fromContent}
                                  </pre>
                                </div>
                              )}
                              {/* Right side: Newer version */}
                              {!isDeleted && (
                                <div className="border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-3 bg-emerald-50/5 dark:bg-emerald-950/5">
                                  <div className="text-[10px] text-emerald-500 font-bold uppercase mb-2">Updated Content</div>
                                  <pre className="overflow-x-auto whitespace-pre-wrap max-h-48 text-emerald-700 dark:text-emerald-400">
                                    {diff.toContent}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-24 text-center text-xs text-muted-foreground">No differences found between these versions.</div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* If Normal File View Mode is active */
              <div className="space-y-6">
                <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                  <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Code className="h-4.5 w-4.5 text-indigo-500" />
                      {selectedFilePath || 'HCL Code View'}
                    </CardTitle>
                    {selectedFilePath && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(files?.find((f: any) => f.filePath === selectedFilePath)?.sizeBytes || 0)} Bytes
                      </span>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingContent ? (
                      <div className="py-24 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" /> Loading file content...
                      </div>
                    ) : fileContent?.content ? (
                      <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs overflow-auto max-h-[500px] leading-relaxed rounded-b-xl">
                        {fileContent.content}
                      </pre>
                    ) : (
                      <div className="py-24 text-center text-xs text-muted-foreground">Select a file from the directory tree to preview its content.</div>
                    )}
                  </CardContent>
                </Card>

                {/* Validation logs & tools card */}
                {versionDetails?.validation && versionDetails.validation.length > 0 && (
                  <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
                      <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">CLI Validation Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {versionDetails.validation.map((r: any) => {
                        const isPass = r.status === 'pass';
                        const isWarning = r.status === 'warning';
                        return (
                          <div key={r.id} className="border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-slate-800 mb-2">
                              <span className="font-mono font-bold text-xs uppercase flex items-center gap-1">
                                {isPass ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : isWarning ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-rose-500" />
                                )}
                                {r.tool.replace('_', ' ')}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  isPass
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : isWarning
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/40 dark:text-amber-400'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                }`}
                              >
                                {r.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-1.5">{r.summary}</p>
                            {r.rawOutput && Object.keys(r.rawOutput).length > 0 && (
                              <pre className="bg-slate-900 dark:bg-slate-950 border border-slate-800 text-[10px] text-slate-300 p-2 rounded max-h-36 overflow-auto font-mono">
                                {JSON.stringify(r.rawOutput, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Compilation Logs logs card */}
                {versionDetails?.logs && versionDetails.logs.length > 0 && (
                  <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
                      <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Generation Step logs</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="bg-slate-950 p-3 rounded-lg max-h-60 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1">
                        {versionDetails.logs.map((l: any) => (
                          <div key={l.id} className="flex gap-2">
                            <span className="text-indigo-400">[{l.stage}]</span>
                            <span className={l.level === 'error' ? 'text-rose-500' : l.level === 'warning' ? 'text-amber-500' : 'text-slate-300'}>
                              {l.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

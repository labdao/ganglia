"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { notFound } from "next/navigation";
import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import * as z from "zod";

import { PageLoader } from "@/components/shared/PageLoader";
import { ToolSelect } from "@/components/shared/ToolSelect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LabelDescription } from "@/components/ui/label";
import { AppDispatch, selectToolDetail, selectToolDetailError, selectToolDetailLoading, toolDetailThunk, toolListThunk } from "@/lib/redux";

import { DynamicArrayField } from "./DynamicArrayField";
import { generateDefaultValues, generateSchema } from "./formGenerator";
import TaskPageHeader from "./TaskPageHeader";
import { ChevronsUpDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VariantSummary } from "./VariantSummary";

export default function TaskDetail({ params }: { params: { slug: string } }) {
  const dispatch = useDispatch<AppDispatch>();

  // Temporarily hardcode the task - we'll fetch this from the API later based on the page slug
  const task = useMemo(
    () => ({
      name: "protein design",
      slug: "protein-design", //Could fetch by a slug or ID, whatever you want the url to be
      default_tool: {
        //CID: "QmXHQhZG8PSNY9g8MAcsHjGYWSrbZpPjaoPPk9QoRZCT3w",
        CID: "QmbxyLKaZg73PvnREPdVitKziw2xTDjTp268VNy1hMkR5E",
      },
    }),
    []
  );

  if (task.slug !== params?.slug) {
    notFound();
  }

  const tool = useSelector(selectToolDetail);
  const toolDetailLoading = useSelector(selectToolDetailLoading);
  const toolDetailError = useSelector(selectToolDetailError);

  // On page load fetch the default tool details
  useEffect(() => {
    const defaultToolCID = task.default_tool?.CID;
    if (defaultToolCID) {
      dispatch(toolDetailThunk(defaultToolCID));
    }
  }, [dispatch, task.default_tool?.CID]);

  // Order and group the inputs by their position and grouping value
  const sortedInputs = Object.entries(tool.ToolJson?.inputs)
    // @ts-ignore
    .sort(([, a], [, b]) => a.position - b.position);

  const groupedInputs = sortedInputs.reduce((acc: { [key: string]: any }, [key, input]: [string, any]) => {
    // _advanced and any others with _ get added to collapsible
    const sectionName = input.grouping?.startsWith("_") ? "collapsible" : "standard";
    const groupName = input.grouping || "Options";
    if (!acc[sectionName]) {
      acc[sectionName] = {};
    }
    if (!acc[sectionName][groupName]) {
      acc[sectionName][groupName] = {};
    }
    acc[sectionName][groupName][key] = input;
    return acc;
  }, {});

  const formSchema = generateSchema(tool.ToolJson?.inputs);
  const defaultValues = generateDefaultValues(tool.ToolJson?.inputs, task, tool);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    form.reset(generateDefaultValues(tool.ToolJson?.inputs, task, tool));
  }, [tool, form, task]);

  // If the tool changes, fetch new tool details
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === "tool" && value?.tool) {
        dispatch(toolDetailThunk(value.tool));
      }
    });
    return () => subscription.unsubscribe();
  }, [dispatch, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("===== Form Submitted =====", values);
  }

  return (
    <>
      <div className="container mt-8">
        {toolDetailError && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{toolDetailError}</AlertDescription>
          </Alert>
        )}
        <>
          <TaskPageHeader tool={tool} task={task} />

          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2">
              <Form {...form}>
                <form id="task-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <Card>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Name <LabelDescription>string</LabelDescription>
                            </FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>Name your experiment</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tool"
                        key={tool?.CID}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                              <ToolSelect onChange={field.onChange} defaultValue={tool?.CID} />
                            </FormControl>
                            <FormDescription>
                              <a
                                className="text-accent hover:underline"
                                target="_blank"
                                href={`${process.env.NEXT_PUBLIC_IPFS_GATEWAY_ENDPOINT}${tool?.CID}/`}
                              >
                                View Tool Manifest
                              </a>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  {!toolDetailLoading && (
                    <>
                      {Object.keys(groupedInputs?.standard || {}).map((groupKey) => {
                        return (
                          <Card key={groupKey}>
                            <CardHeader>
                              <CardTitle className="uppercase">{groupKey}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {Object.keys(groupedInputs?.standard[groupKey] || {}).map((key) => {
                                // @ts-ignore
                                const input = groupedInputs?.standard?.[groupKey]?.[key];
                                return <DynamicArrayField key={key} inputKey={key} form={form} input={input} />;
                              })}
                            </CardContent>
                          </Card>
                        );
                      })}

                      {Object.keys(groupedInputs?.collapsible || {}).map((groupKey) => {
                        return (
                          <Card key={groupKey}>
                            <Collapsible>
                              <CollapsibleTrigger className="flex items-center justify-between w-full p-6 text-left uppercase text-bold font-heading">
                                {groupKey.replace("_", "")}
                                <ChevronsUpDownIcon />
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <CardContent className="pt-0 space-y-4">
                                  {Object.keys(groupedInputs?.collapsible[groupKey] || {}).map((key) => {
                                    // @ts-ignore
                                    const input = groupedInputs?.collapsible?.[groupKey]?.[key];
                                    return <DynamicArrayField key={key} inputKey={key} form={form} input={input} />;
                                  })}
                                </CardContent>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        );
                      })}
                    </>
                  )}
                </form>
              </Form>
            </div>
            <div>
              <Card className="sticky top-4">
                <CardContent>
                  <VariantSummary sortedInputs={sortedInputs} form={form} />
                  <Button type="submit" form="task-form" className="w-full">
                    Submit
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
        {toolDetailLoading && <PageLoader />}
      </div>
    </>
  );
}
